import asyncio
import json
import re
import logging
import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import sys

from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
import openai
import requests

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("La variable d'environnement OPENAI_API_KEY doit être définie")

OPENAI_API_KEY = str(OPENAI_API_KEY)  # Cast pour le type checker
AGENT_SEED = "flow_crypto_agent_seed"
AGENT_PORT = 8001
AGENT_ENDPOINT = ["http://127.0.0.1:8001/submit"]

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Modèles de données
class ActionType(Enum):
    STAKE = "stake"
    SWAP = "swap"
    BALANCE = "balance"
    CONVERSATION = "conversation"  # Nouveau type pour les conversations normales
    UNKNOWN = "unknown"

@dataclass
class ParsedAction:
    action_type: ActionType
    confidence: float
    parameters: Dict[str, Any]
    raw_message: str
    user_response: str = ""  # Nouveau champ pour la réponse utilisateur

class UserMessage(Model):
    content: str
    user_id: str

class ActionResponse(Model):
    success: bool
    message: str
    function_call: Optional[str] = None
    requires_confirmation: bool = False
    action_id: Optional[str] = None

class ConfirmationMessage(Model):
    action_id: str
    confirmed: bool
    user_id: str

class FlowCryptoAI:
    """
    Classe d'intelligence artificielle pour comprendre les intentions crypto
    """
    
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.system_prompt = """
        Tu es un assistant crypto spécialisé dans l'analyse d'intentions pour une plateforme Flow.
        
        Ton rôle est double :
        1. Analyser si le message est une ACTION crypto spécifique (stake, swap, balance check)
        2. Fournir une réponse conversationnelle appropriée
        
        ACTIONS CRYPTO DÉTECTABLES :
        - stake : staking de tokens (paramètres: amount, validator)
        - swap : échange de tokens (paramètres: from_token, to_token, amount)
        - balance : vérification de solde (paramètres: wallet_address)
        - conversation : discussion générale, questions, salutations
        - unknown : intention vraiment pas claire
        
        RÈGLES IMPORTANTES :
        - Si c'est une ACTION crypto claire, action_type = "stake"/"swap"/"balance"
        - Si c'est une conversation normale, action_type = "conversation"
        - TOUJOURS inclure un user_response adapté et naturel
        - Extrait UNIQUEMENT les informations explicitement mentionnées
        - Les montants doivent être des nombres (float)
        - Les noms de tokens/validators en minuscules
        - Les adresses wallet doivent commencer par 0x
        
        EXEMPLES DE RÉPONSES :
        
        Pour une action stake :
        {
            "action_type": "stake",
            "confidence": 0.95,
            "parameters": {
                "amount": 150.0,
                "validator": "blocto"
            },
            "user_response": "Parfait ! Je vais préparer le staking de 150 FLOW avec le validator Blocto pour vous.",
            "missing_info": []
        }
        
        Pour une conversation :
        {
            "action_type": "conversation",
            "confidence": 0.9,
            "parameters": {},
            "user_response": "Bonjour ! Je suis là pour vous aider avec vos opérations crypto sur Flow. Vous pouvez me demander de staker des tokens, effectuer des swaps, ou vérifier vos soldes. Comment puis-je vous aider ?",
            "missing_info": []
        }
        
        TOUJOURS retourner un JSON avec ces champs exacts.
        """
        
        # Prompts pour les réponses conversationnelles
        self.conversation_system_prompt = """
        Tu es un assistant crypto amical et professionnel spécialisé dans la blockchain Flow.
        
        Réponds de manière naturelle et utile aux questions des utilisateurs.
        - Sois concis mais informatif
        - Utilise un ton amical et professionnel  
        - Propose de l'aide pour les actions crypto (stake, swap, balance)
        - Si on te demande quelque chose que tu ne peux pas faire, explique gentiment
        - Reste dans le contexte crypto/Flow autant que possible
        
        Réponds directement sans JSON, juste le texte de réponse.
        """
    
    async def analyze_message(self, message: str) -> ParsedAction:
        """Analyse un message utilisateur avec l'IA"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            # Parse de la réponse JSON
            content = response.choices[0].message.content
            if not content:
                raise ValueError("La réponse du LLM est vide.")
            
            ai_response = json.loads(content)
            
            return ParsedAction(
                action_type=ActionType(ai_response.get("action_type", "unknown")),
                confidence=ai_response.get("confidence", 0.0),
                parameters=ai_response.get("parameters", {}),
                raw_message=message,
                user_response=ai_response.get("user_response", "")
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse IA: {e}")
            # Réponse de fallback plus naturelle
            return ParsedAction(
                action_type=ActionType.CONVERSATION,
                confidence=0.5,
                parameters={},
                raw_message=message,
                user_response="Je n'ai pas bien compris votre message. Pouvez-vous reformuler ? Je peux vous aider avec le staking, les swaps ou vérifier vos soldes."
            )

    async def analyze_message_raw(self, message: str) -> tuple[ParsedAction, str]:
        """Analyse un message utilisateur avec l'IA et retourne aussi la réponse brute"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            # Parse de la réponse JSON
            content = response.choices[0].message.content
            if not content:
                raise ValueError("La réponse du LLM est vide.")
            ai_response = json.loads(content)
            
            parsed = ParsedAction(
                action_type=ActionType(ai_response.get("action_type", "unknown")),
                confidence=ai_response.get("confidence", 0.0),
                parameters=ai_response.get("parameters", {}),
                raw_message=message,
                user_response=ai_response.get("user_response", "")
            )
            return parsed, content
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse IA: {e}")
            return ParsedAction(
                action_type=ActionType.CONVERSATION,
                confidence=0.5,
                parameters={},
                raw_message=message,
                user_response="Je n'ai pas bien compris votre message. Pouvez-vous reformuler ?"
            ), ""

    async def generate_conversation_response(self, message: str) -> str:
        """Génère une réponse conversationnelle pour les messages non-actions"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self.conversation_system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            content = response.choices[0].message.content
            return content if content else "Comment puis-je vous aider avec vos opérations crypto ?"
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de réponse: {e}")
            return "Je suis là pour vous aider avec vos opérations crypto. Que puis-je faire pour vous ?"

class FlowCryptoAgent:
    """
    Agent µAgents pour les opérations crypto Flow
    """
    
    def __init__(self, api_key: str):
        self.agent = Agent(
            name="flow_crypto_agent",
            seed=AGENT_SEED,
            port=AGENT_PORT,
            endpoint=AGENT_ENDPOINT
        )
        
        self.ai = FlowCryptoAI(api_key)
        self.pending_actions: Dict[str, ParsedAction] = {}
        
        # Enregistrement des handlers
        self.register_handlers()
        
        # Financement de l'agent si nécessaire
        fund_agent_if_low(str(self.agent.wallet.address()))
    
    def register_handlers(self):
        """Enregistre les handlers de messages"""
        
        @self.agent.on_message(model=UserMessage)
        async def handle_user_message(ctx: Context, sender: str, msg: UserMessage):
            """Traite les messages utilisateur"""
            logger.info(f"Message reçu de {sender}: {msg.content}")
            
            # Analyse du message avec l'IA
            parsed_action = await self.ai.analyze_message(msg.content)
            
            # Traitement selon le type d'action
            if parsed_action.action_type == ActionType.CONVERSATION:
                # Réponse conversationnelle normale
                response = ActionResponse(
                    success=True,
                    message=parsed_action.user_response,
                    requires_confirmation=False
                )
            
            elif parsed_action.action_type == ActionType.UNKNOWN:
                response = ActionResponse(
                    success=False,
                    message=parsed_action.user_response or "Je n'ai pas pu comprendre votre demande. Pouvez-vous reformuler ?",
                    requires_confirmation=False
                )
            
            elif parsed_action.confidence < 0.7:
                response = ActionResponse(
                    success=False,
                    message=parsed_action.user_response or "Je ne suis pas sûr de comprendre votre demande. Pouvez-vous être plus précis ?",
                    requires_confirmation=False
                )
            
            else:
                # Action crypto - traitement avec fonction + réponse
                response = await self.process_action(parsed_action, msg.user_id)
            
            await ctx.send(sender, response)
        
        @self.agent.on_message(model=ConfirmationMessage)
        async def handle_confirmation(ctx: Context, sender: str, msg: ConfirmationMessage):
            """Traite les confirmations d'actions"""
            logger.info(f"Confirmation reçue de {sender}: {msg.confirmed}")
            
            if msg.action_id not in self.pending_actions:
                response = ActionResponse(
                    success=False,
                    message="Aucune action en attente à confirmer.",
                    requires_confirmation=False
                )
            else:
                if msg.confirmed:
                    action = self.pending_actions.pop(msg.action_id)
                    function_call = self.generate_function_call(action)
                    response = ActionResponse(
                        success=True,
                        message="Parfait ! Votre action a été confirmée et est en cours d'exécution. 🚀",
                        function_call=function_call,
                        requires_confirmation=False
                    )
                else:
                    self.pending_actions.pop(msg.action_id)
                    response = ActionResponse(
                        success=True,
                        message="Pas de problème, j'ai annulé cette action. N'hésitez pas si vous avez besoin d'autre chose !",
                        requires_confirmation=False
                    )
            
            await ctx.send(sender, response)
    
    async def process_action(self, action: ParsedAction, user_id: str) -> ActionResponse:
        """Traite une action analysée"""
        
        if action.action_type == ActionType.BALANCE:
            return await self.process_balance_action(action)
        
        elif action.action_type in [ActionType.STAKE, ActionType.SWAP]:
            return await self.process_critical_action(action, user_id)
        
        else:
            return ActionResponse(
                success=False,
                message="Type d'action non supporté.",
                requires_confirmation=False
            )
    
    async def process_balance_action(self, action: ParsedAction) -> ActionResponse:
        """Traite une demande de vérification de solde"""
        wallet_address = action.parameters.get("wallet_address")
        
        if not wallet_address:
            return ActionResponse(
                success=False,
                message="Il me faut une adresse wallet pour vérifier le solde. Pouvez-vous me donner une adresse valide (qui commence par 0x) ?",
                requires_confirmation=False
            )
        
        if not self.validate_wallet_address(wallet_address):
            return ActionResponse(
                success=False,
                message="Cette adresse wallet ne semble pas valide. Elle doit commencer par '0x'. Pouvez-vous vérifier ?",
                requires_confirmation=False
            )
        
        function_call = f'check_balance("{wallet_address}")'
        
        return ActionResponse(
            success=True,
            message=f"Je vérifie le solde de votre wallet {wallet_address[:8]}... 💰",
            function_call=function_call,
            requires_confirmation=False
        )
    
    async def process_critical_action(self, action: ParsedAction, user_id: str) -> ActionResponse:
        """Traite une action critique nécessitant confirmation"""
        
        # Validation des paramètres
        validation_error = self.validate_action_parameters(action)
        if validation_error:
            return ActionResponse(
                success=False,
                message=validation_error,
                requires_confirmation=False
            )
        
        # Génération d'un ID unique pour l'action
        action_id = f"{user_id}_{action.action_type.value}_{hash(action.raw_message)}"
        self.pending_actions[action_id] = action
        
        # Message de confirmation avec réponse utilisateur
        base_response = action.user_response if action.user_response else ""
        confirmation_message = self.generate_confirmation_message(action)
        
        # Combiner la réponse IA avec la demande de confirmation
        full_message = f"{base_response}\n\n{confirmation_message}"
        
        return ActionResponse(
            success=True,
            message=full_message,
            requires_confirmation=True,
            action_id=action_id
        )
    
    def validate_action_parameters(self, action: ParsedAction) -> Optional[str]:
        """Valide les paramètres d'une action"""
        
        if action.action_type == ActionType.STAKE:
            amount = action.parameters.get("amount")
            validator = action.parameters.get("validator")
            
            if not amount or amount <= 0:
                return "Le montant pour le staking doit être positif. Pouvez-vous préciser combien vous voulez staker ?"
            if not validator:
                return "Il me faut le nom du validator pour le staking. Quel validator préférez-vous ?"
        
        elif action.action_type == ActionType.SWAP:
            amount = action.parameters.get("amount")
            from_token = action.parameters.get("from_token")
            to_token = action.parameters.get("to_token")
            
            if not amount or amount <= 0:
                return "Le montant pour l'échange doit être positif. Combien voulez-vous échanger ?"
            if not from_token or not to_token:
                return "Il me faut les deux tokens pour l'échange. De quel token vers quel token voulez-vous échanger ?"
            if from_token == to_token:
                return "Vous ne pouvez pas échanger un token contre lui-même ! 😄"
        
        return None
    
    def validate_wallet_address(self, address: str) -> bool:
        """Valide une adresse wallet"""
        return isinstance(address, str) and address.startswith("0x") and len(address) >= 8
    
    def generate_confirmation_message(self, action: ParsedAction) -> str:
        """Génère un message de confirmation"""
        
        if action.action_type == ActionType.STAKE:
            amount = action.parameters["amount"]
            validator = action.parameters["validator"]
            return f"⚠️ Confirmation requise :\nStaking de {amount} FLOW avec le validator {validator}.\n\nVoulez-vous continuer ? (Répondez 'oui' ou 'non')"
        
        elif action.action_type == ActionType.SWAP:
            amount = action.parameters["amount"]
            from_token = action.parameters["from_token"].upper()
            to_token = action.parameters["to_token"].upper()
            return f"⚠️ Confirmation requise :\nÉchange de {amount} {from_token} contre {to_token}.\n\nVoulez-vous continuer ? (Répondez 'oui' ou 'non')"
        
        return "⚠️ Confirmez-vous cette action ?"
    
    def generate_function_call(self, action: ParsedAction) -> str:
        """Génère l'appel de fonction pour une action"""
        
        if action.action_type == ActionType.STAKE:
            amount = action.parameters["amount"]
            validator = action.parameters["validator"]
            return f'stake_tokens({amount}, "{validator}")'
        
        elif action.action_type == ActionType.SWAP:
            amount = action.parameters["amount"]
            from_token = action.parameters["from_token"]
            to_token = action.parameters["to_token"]
            return f'swap_tokens("{from_token}", "{to_token}", {amount})'
        
        return "Erreur dans la génération de l'appel de fonction."
    
    def run(self):
        """Lance l'agent"""
        logger.info(f"Agent démarré sur {self.agent.address}")
        self.agent.run()

# Client pour tester l'agent
class FlowCryptoClient:
    """Client pour interagir avec l'agent crypto"""
    
    def __init__(self, agent_address: str):
        self.agent_address = agent_address
        self.user_id = "test_user_123"
    
    async def send_message(self, content: str):
        """Envoie un message à l'agent"""
        message = UserMessage(content=content, user_id=self.user_id)
        print(f"Envoi du message: {content}")
    
    async def confirm_action(self, action_id: str, confirmed: bool):
        """Confirme ou annule une action"""
        confirmation = ConfirmationMessage(
            action_id=action_id,
            confirmed=confirmed,
            user_id=self.user_id
        )
        print(f"Confirmation envoyée: {confirmed}")

async def interactive_chat():
    """Interface interactive pour discuter avec l'agent"""
    print("=== Interface Interactive avec l'Agent Crypto Flow ===")
    print("Tapez 'quit' pour quitter")
    print("Tapez 'help' pour voir les exemples")
    print("-" * 50)
    
    # Créer une instance de l'IA pour les tests interactifs
    ai = FlowCryptoAI(OPENAI_API_KEY)
    
    while True:
        try:
            user_input = input("\nVous: ").strip()
            
            if user_input.lower() == 'quit':
                print("Au revoir !")
                break
            elif user_input.lower() == 'help':
                print("\nExemples de messages :")
                print("=== Actions crypto ===")
                print("- Je veux placer 150 FLOW en staking chez Blocto")
                print("- Peux-tu échanger 20 USDC contre du FLOW ?")
                print("- Montre-moi le solde de 0x1234567890abcdef")
                print("- Combien j'ai sur mon portefeuille 0xABC123 ?")
                print("- Déléguer 500 tokens au validateur Dapper")
                print("=== Conversations ===")
                print("- Bonjour, comment ça va ?")
                print("- Qu'est-ce que tu peux faire ?")
                print("- Comment fonctionne le staking ?")
                print("- Explique-moi Flow")
                continue
            elif not user_input:
                continue
            
            # Analyser le message avec l'IA
            result, raw = await ai.analyze_message_raw(user_input)
            
            print(f"\n🤖 IA: Réponse brute du modèle:")
            print(f"   {raw}")
            print(f"\n📊 Analyse:")
            print(f"   Action détectée: {result.action_type.value}")
            print(f"   Confiance: {result.confidence:.2f}")
            print(f"   Paramètres: {result.parameters}")
            print(f"   Réponse utilisateur: {result.user_response}")
            
            # Simuler la réponse de l'agent
            if result.action_type == ActionType.CONVERSATION:
                print(f"\n💬 Agent: {result.user_response}")
            
            elif result.action_type == ActionType.UNKNOWN:
                print(f"\n❓ Agent: {result.user_response}")
            
            elif result.confidence < 0.7:
                print(f"\n🤔 Agent: {result.user_response}")
            
            else:
                # Réponse avec fonction
                print(f"\n🤖 Agent: {result.user_response}")
                
                if result.action_type == ActionType.BALANCE:
                    wallet = result.parameters.get("wallet_address", "adresse manquante")
                    print(f"   ⚡ Fonction appelée: check_balance('{wallet}')")
                
                elif result.action_type == ActionType.STAKE:
                    amount = result.parameters.get("amount", "montant manquant")
                    validator = result.parameters.get("validator", "validator manquant")
                    print(f"   ⚠️ Confirmation requise pour staking {amount} FLOW avec {validator}")
                    print(f"   ⚡ Fonction prête: stake_tokens({amount}, '{validator}')")
                
                elif result.action_type == ActionType.SWAP:
                    amount = result.parameters.get("amount", "montant manquant")
                    from_token = result.parameters.get("from_token", "token source manquant")
                    to_token = result.parameters.get("to_token", "token destination manquant")
                    print(f"   ⚠️ Confirmation requise pour swap {amount} {from_token} -> {to_token}")
                    print(f"   ⚡ Fonction prête: swap_tokens('{from_token}', '{to_token}', {amount})")
            
        except KeyboardInterrupt:
            print("\n\nAu revoir !")
            break
        except Exception as e:
            print(f"\n❌ Erreur: {e}")
            continue

# Tests unitaires
async def test_ai_analysis():
    """Test de l'analyse IA"""
    print("[DEBUG] = Test starting")

    ai = FlowCryptoAI(OPENAI_API_KEY)
    
    test_messages = [
        "Je veux placer 150 FLOW en staking chez Blocto",
        "Peux-tu échanger 20 USDC contre du FLOW ?",
        "Montre-moi le solde de 0x1234567890abcdef",
        "Combien j'ai sur mon portefeuille 0xABC123 ?",
        "Déléguer 500 tokens au validateur Dapper",
        "Hello comment ça va ?",
        "tu peux me dire comment investir mes bitcoin ?",
        "Qu'est-ce que tu peux faire ?",
        "Bonjour !",
        "Comment fonctionne le staking sur Flow ?"
    ]
    
    for message in test_messages:
        result, raw = await ai.analyze_message_raw(message)
        print(f"Message: {message}")
        print(f"Réponse brute du modèle : {raw}")
        print(f"Action: {result.action_type}")
        print(f"Confiance: {result.confidence}")
        print(f"Paramètres: {result.parameters}")
        print(f"Réponse utilisateur: {result.user_response}")
        print("-" * 50)

# Exemple d'utilisation
if __name__ == "__main__":
    if "test" in sys.argv:
        asyncio.run(test_ai_analysis())
    elif "interactive" in sys.argv:
        asyncio.run(interactive_chat())
    else:
        crypto_agent = FlowCryptoAgent(OPENAI_API_KEY)
        print("=== Agent Crypto Flow avec µAgents et IA ===")
        print(f"Adresse de l'agent: {crypto_agent.agent.address}")
        print("L'agent est prêt à recevoir des messages...")
        print("\nPour tester l'IA en mode interactif, lancez :")
        print("python bouyaa.py interactive")
        crypto_agent.run()