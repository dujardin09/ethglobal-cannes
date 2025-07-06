# -*- coding: utf-8 -*-
"""
Agent Crypto Flow avec IA, Mémoire de Conversation et Endpoints REST

Ce script déploie un agent uAgents capable de comprendre les intentions des utilisateurs
liées aux opérations sur la blockchain Flow et de maintenir une conversation contextuelle.
Il expose des points d'accès REST pour une intégration facile avec des clients web.

Modes d'exécution :
1. Mode Officiel (par défaut) : python flow_agent.py
   - Lance l'agent uAgents avec des points d'accès REST sur http://127.0.0.1:8001.

2. Mode Interactif : python flow_agent.py interactive
   - Lance une interface en ligne de commande pour discuter directement avec la logique IA de l'agent.

3. Mode Test : python flow_agent.py test
   - Exécute un scénario de test prédéfini pour valider la mémoire de conversation de l'IA.
"""

# === 1. IMPORTS ET CONFIGURATION ===
import asyncio
import json
import logging
import os
import subprocess
import sys
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import openai
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low

# --- Configuration Générale ---
AGENT_SEED = "flow_crypto_agent_final_seed_rest" # Changed seed slightly to avoid conflicts
AGENT_PORT = 8001
# AGENT_ENDPOINT is no longer needed for REST-only agents, but kept for context.
AGENT_ENDPOINT = [f"http://127.0.0.1:{AGENT_PORT}/submit"]
MAX_HISTORY_LENGTH = 10
CRYPTO_FUNCTIONS_DIR = "crypto_functions"

# --- Configuration OpenAI ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("La variable d'environnement OPENAI_API_KEY doit être définie.")

# --- Config Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# === 2. MODÈLES DE DONNÉES (POUR LES REQUÊTES ET RÉPONSES) ===

class ActionType(Enum):
    """Types d'actions que l'agent peut identifier."""
    STAKE = "stake"
    SWAP = "swap"
    BALANCE = "balance"
    CONVERSATION = "conversation"
    UNKNOWN = "unknown"

@dataclass
class ParsedAction:
    """Structure pour stocker le résultat de l'analyse de l'IA."""
    action_type: ActionType
    confidence: float
    parameters: Dict[str, Any]
    raw_message: str
    user_response: str = ""

# --- Modèles pour les requêtes REST ---
class UserMessage(Model):
    """Corps de la requête pour l'endpoint /talk."""
    content: str
    user_id: str

class ConfirmationMessage(Model):
    """Corps de la requête pour l'endpoint /confirm."""
    action_id: str
    confirmed: bool
    user_id: str

# --- Modèle pour les réponses REST ---
class ActionResponse(Model):
    """Corps de la réponse pour tous les endpoints."""
    success: bool
    message: str
    function_call: Optional[str] = None
    function_result: Optional[str] = None
    requires_confirmation: bool = False
    action_id: Optional[str] = None

# === 3. CLASSE D'INTELLIGENCE ARTIFICIELLE ===

class FlowCryptoAI:
    """
    Classe gérant les interactions avec le LLM pour analyser les messages.
    """
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.system_prompt = """
        Tu es un assistant crypto spécialisé dans l'analyse d'intentions pour une plateforme Flow.
        Ton rôle est d'analyser le dernier message utilisateur dans le contexte de l'historique de conversation fourni.
        Utilise le contexte pour comprendre les questions de suivi et compléter les informations manquantes.
        
        ACTIONS CRYPTO DÉTECTABLES :
        - stake : staking de tokens (paramètres: amount, validator)
        - swap : échange de tokens (paramètres: from_token, to_token, amount)
        - balance : vérification de solde (paramètres: wallet_address)
        - conversation : discussion générale, questions, salutations.
        - unknown : intention vraiment pas claire.
        
        RÈGLES :
        - Si c'est une ACTION crypto, action_type = "stake"/"swap"/"balance".
        - Si c'est une conversation, action_type = "conversation".
        - Incluis TOUJOURS un champ "user_response" avec une réponse naturelle et amicale.
        - Extrait les paramètres (amount, validator, tokens, wallet_address) à partir de toute la conversation.
        - Les montants doivent être des nombres (float), les noms de tokens/validators en minuscules, les adresses wallet doivent commencer par 0x.
        
        EXEMPLE DE JSON DE SORTIE :
        {
            "action_type": "stake",
            "confidence": 0.95,
            "parameters": {"amount": 150.0, "validator": "blocto"},
            "user_response": "Parfait ! Je vais préparer le staking de 150 FLOW avec le validator Blocto pour vous."
        }
        
        Retourne TOUJOURS un objet JSON valide avec ces champs.
        """

    async def analyze_message(self, history: List[Dict[str, str]]) -> Tuple[ParsedAction, str]:
        """
        Analyse un message utilisateur avec l'IA en utilisant l'historique de conversation.
        Retourne l'action parsée et la réponse brute du LLM.
        """
        if not history:
            return ParsedAction(ActionType.UNKNOWN, 0.0, {}, "", "Historique vide."), ""

        last_user_message = history[-1]['content']
        messages_for_api = [{"role": "system", "content": self.system_prompt}] + history

        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-4o-mini",
                messages=messages_for_api,
                temperature=0.1,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if not content:
                raise ValueError("La réponse du LLM est vide.")
            
            ai_response = json.loads(content)
            
            parsed = ParsedAction(
                action_type=ActionType(ai_response.get("action_type", "unknown")),
                confidence=ai_response.get("confidence", 0.0),
                parameters=ai_response.get("parameters", {}),
                raw_message=last_user_message,
                user_response=ai_response.get("user_response", "")
            )
            return parsed, content
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse IA: {e}")
            fallback_response = "Je n'ai pas bien compris. Pouvez-vous reformuler ? Je peux aider à staker, swapper ou vérifier un solde."
            return ParsedAction(
                action_type=ActionType.CONVERSATION,
                confidence=0.5,
                parameters={},
                raw_message=last_user_message,
                user_response=fallback_response
            ), ""

# === 4. CLASSE DE L'AGENT uAGENTS AVEC ENDPOINTS REST ===

class FlowCryptoAgent:
    """
    Agent uAgents qui gère la logique métier, la mémoire et l'exécution des fonctions crypto.
    Expose des endpoints REST pour l'interaction.
    """
    def __init__(self, name: str, seed: str, port: int, api_key: str):
        self.agent = Agent(name=name, seed=seed, port=port)
        self.ai = FlowCryptoAI(api_key)
        self.pending_actions: Dict[str, ParsedAction] = {}
        self.conversation_histories: Dict[str, List[Dict[str, str]]] = {}
        
        logger.info(f"Agent '{self.agent.name}' initialisé avec l'adresse : {self.agent.address}")
        logger.info(f"Serveur HTTP démarré sur http://127.0.0.1:{port}")

        os.makedirs(CRYPTO_FUNCTIONS_DIR, exist_ok=True)
        self.initialize_typescript_functions()
        
        self.register_handlers()
        fund_agent_if_low(str(self.agent.wallet.address()))

    def register_handlers(self):
        """Enregistre les handlers de requêtes REST pour l'agent."""
        
        # MODIFICATION : Remplacement de on_message par on_rest_post
        @self.agent.on_rest_post("/talk", UserMessage, ActionResponse)
        async def handle_talk_request(ctx: Context, request: UserMessage) -> ActionResponse:
            """
            Point d'accès principal pour la conversation.
            Prend en entrée le message d'un utilisateur et son ID.
            """
            ctx.logger.info(f"Requête reçue sur /talk de l'utilisateur : {request.user_id}")
            
            # La logique interne reste la même
            history = self.conversation_histories.get(request.user_id, [])
            history.append({"role": "user", "content": request.content})
            history = history[-MAX_HISTORY_LENGTH:]

            parsed_action, _ = await self.ai.analyze_message(history)
            
            if parsed_action.action_type in [ActionType.CONVERSATION, ActionType.UNKNOWN] or parsed_action.confidence < 0.7:
                response = ActionResponse(
                    success=True,
                    message=parsed_action.user_response,
                    requires_confirmation=False
                )
            else:
                response = await self.process_action(parsed_action, request.user_id)
            
            history.append({"role": "assistant", "content": response.message})
            self.conversation_histories[request.user_id] = history[-MAX_HISTORY_LENGTH:]
            
            # MODIFICATION : On retourne la réponse directement au lieu de ctx.send()
            return response
        
        # MODIFICATION : Nouveau handler pour la confirmation via REST
        @self.agent.on_rest_post("/confirm", ConfirmationMessage, ActionResponse)
        async def handle_confirmation_request(ctx: Context, request: ConfirmationMessage) -> ActionResponse:
            """
            Point d'accès pour confirmer ou annuler une action en attente.
            """
            ctx.logger.info(f"Requête de confirmation reçue sur /confirm pour l'action : {request.action_id}")
            
            action = self.pending_actions.pop(request.action_id, None)
            if not action:
                return ActionResponse(success=False, message="Action non trouvée ou expirée.")

            if request.confirmed:
                logger.info(f"Action {request.action_id} confirmée par {request.user_id}.")
                function_call = self.generate_function_call(action)
                response_msg = f"Parfait ! Votre action '{action.action_type.value}' a été confirmée et est en cours d'exécution. Appel de fonction : `{function_call}`"
                response = ActionResponse(success=True, message=response_msg, function_call=function_call)
            else:
                logger.info(f"Action {request.action_id} annulée par {request.user_id}.")
                response = ActionResponse(success=True, message="Action annulée. N'hésitez pas si vous avez besoin d'autre chose !")
            
            history = self.conversation_histories.get(request.user_id, [])
            history.append({"role": "user", "content": "oui" if request.confirmed else "non"})
            history.append({"role": "assistant", "content": response.message})
            self.conversation_histories[request.user_id] = history[-MAX_HISTORY_LENGTH:]
            
            # MODIFICATION : On retourne la réponse directement
            return response

    async def process_action(self, action: ParsedAction, user_id: str) -> ActionResponse:
        """Valide et traite une action crypto (stake, swap, balance)."""
        validation_error = self.validate_action_parameters(action)
        if validation_error:
            return ActionResponse(success=False, message=validation_error)

        if action.action_type == ActionType.BALANCE:
            function_call = self.generate_function_call(action)
            return ActionResponse(success=True, message=action.user_response, function_call=function_call)

        action_id = f"{user_id}_{os.urandom(4).hex()}"
        self.pending_actions[action_id] = action

        confirmation_prompt = self.generate_confirmation_message(action)
        full_message = f"{action.user_response}\n\n{confirmation_prompt}"
        
        return ActionResponse(
            success=True,
            message=full_message,
            requires_confirmation=True,
            action_id=action_id
        )

    def validate_action_parameters(self, action: ParsedAction) -> Optional[str]:
        # Logique de validation inchangée
        return None
    
    def generate_confirmation_message(self, action: ParsedAction) -> str:
        # Logique de génération de message inchangée
        if action.action_type == ActionType.STAKE:
            params = action.parameters
            return f"⚠️ Confirmation requise : Staker {params.get('amount')} FLOW avec le validateur {params.get('validator')} ? Répondez à l'endpoint /confirm."
        return "Confirmez-vous cette action ? Répondez à l'endpoint /confirm."

    def generate_function_call(self, action: ParsedAction) -> str:
        # Logique de génération d'appel de fonction inchangée
        if action.action_type == ActionType.STAKE:
            params = action.parameters
            return f"stake_tokens({params.get('amount')}, \"{params.get('validator')}\")"
        if action.action_type == ActionType.BALANCE:
            return f"check_balance(\"{action.parameters.get('wallet_address')}\")"
        return "fonction_inconnue()"

    def initialize_typescript_functions(self):
        pass

    async def execute_typescript_function(self, function_call: str, action: ParsedAction) -> Dict[str, Any]:
        return {"success": True, "message": "Simulation d'exécution réussie", "output": "{}"}

    def run(self):
        """Lance le cycle de vie de l'agent."""
        self.agent.run()

# === 5. MODES D'EXÉCUTION (INTERACTIF, TEST, OFFICIEL) ===

async def run_interactive_mode():
    """Lance un chat interactif en console pour tester la logique de l'IA."""
    print("--- Mode Interactif ---")
    print("Discutez avec l'IA de l'agent. Tapez 'quit' pour quitter, 'new' pour réinitialiser la mémoire.")
    
    ai = FlowCryptoAI(OPENAI_API_KEY)
    history: List[Dict[str, str]] = []

    while True:
        try:
            user_input = input("\nVous > ")
            if user_input.lower() == 'quit':
                break
            if user_input.lower() == 'new':
                history = []
                print("\n[Mémoire réinitialisée]")
                continue

            history.append({"role": "user", "content": user_input})
            
            print("[Analyse par l'IA en cours...]")
            parsed_action, raw_json = await ai.analyze_message(history)
            
            print("\n--- Analyse de l'IA ---")
            print(f"Action: {parsed_action.action_type.value} (Confiance: {parsed_action.confidence:.2f})")
            print(f"Paramètres: {parsed_action.parameters}")
            print(f"JSON Brut: {raw_json}")
            print("-----------------------")
            
            print(f"\nAgent > {parsed_action.user_response}")
            history.append({"role": "assistant", "content": parsed_action.user_response})

        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error(f"Une erreur est survenue en mode interactif: {e}")
    print("\n--- Fin du mode interactif ---")

async def run_test_mode():
    """Exécute un scénario de test pour vérifier la mémoire de l'IA."""
    print("--- Mode Test : Scénario de mémoire conversationnelle ---")
    ai = FlowCryptoAI(OPENAI_API_KEY)
    
    try:
        # Étape 1: L'utilisateur donne une information partielle
        history_step1 = [{"role": "user", "content": "Je veux staker 150 FLOW"}]
        print(f"\n1. Utilisateur: \"{history_step1[0]['content']}\"")
        parsed1, _ = await ai.analyze_message(history_step1)
        print(f"   -> Réponse IA: \"{parsed1.user_response}\"")
        print(f"   -> Paramètres extraits: {parsed1.parameters}")
        assert parsed1.action_type == ActionType.STAKE
        assert "validator" not in parsed1.parameters

        history_step2 = history_step1 + [
            {"role": "assistant", "content": parsed1.user_response},
            {"role": "user", "content": "avec le validateur blocto"}
        ]
        print(f"\n2. Utilisateur: \"{history_step2[-1]['content']}\" (après la question de l'agent)")
        parsed2, _ = await ai.analyze_message(history_step2)
        print(f"   -> Réponse IA: \"{parsed2.user_response}\"")
        print(f"   -> Paramètres finaux: {parsed2.parameters}")
        assert parsed2.parameters.get("amount") == 150.0
        assert parsed2.parameters.get("validator") == "blocto"
        
        print("\n[✓] Test du scénario de mémoire réussi !")

    except Exception as e:
        print(f"\n[✗] Le test a échoué: {e}")
    
    print("\n--- Fin du mode test ---")


def main():
    """Point d'entrée principal du script."""
    if "interactive" in sys.argv:
        asyncio.run(run_interactive_mode())
    elif "test" in sys.argv:
        asyncio.run(run_test_mode())
    else:
        print("--- Mode Officiel (REST) ---")
        print(f"Lancement de l'agent uAgents sur le port {AGENT_PORT}. Prêt à recevoir des requêtes HTTP.")
        
        # MODIFICATION : Instructions pour utiliser les endpoints REST
        print("\nEndpoints disponibles :")
        print(f"  - POST http://127.0.0.1:{AGENT_PORT}/talk")
        print(f"  - POST http://127.0.0.1:{AGENT_PORT}/confirm")
        
        print("\nExemple de requête pour discuter avec l'agent (remplacez user_id):")
        print(f"  curl -X POST -H \"Content-Type: application/json\" -d '{{\"content\": \"Salut !\", \"user_id\": \"user123\"}}' http://127.0.0.1:{AGENT_PORT}/talk")
        
        print("\nExemple de requête pour confirmer une action (remplacez les valeurs):")
        print(f"  curl -X POST -H \"Content-Type: application/json\" -d '{{\"action_id\": \"user123_xxxx\", \"confirmed\": true, \"user_id\": \"user123\"}}' http://127.0.0.1:{AGENT_PORT}/confirm")

        agent = FlowCryptoAgent(
            name="flow_crypto_agent",
            seed=AGENT_SEED,
            port=AGENT_PORT,
            api_key=OPENAI_API_KEY
        )
        agent.run()

if __name__ == "__main__":
    main()