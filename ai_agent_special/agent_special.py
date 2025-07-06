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
import aiohttp  # Nouveau import pour les requêtes HTTP
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low

# --- Configuration Générale ---
AGENT_SEED = "flow_crypto_agent_final_seed_rest" # Changed seed slightly to avoid conflicts
AGENT_PORT = 8001
# AGENT_ENDPOINT is no longer needed for REST-only agents, but kept for context.
AGENT_ENDPOINT = [f"http://127.0.0.1:{AGENT_PORT}/submit"]
MAX_HISTORY_LENGTH = 10
CRYPTO_FUNCTIONS_DIR = "crypto_functions"

# --- Configuration API TypeScript Bridge ---
CRYPTO_BRIDGE_URL = "http://localhost:3003/api"

# --- Configuration OpenAI ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("La variable d'environnement OPENAI_API_KEY doit être définie.")

# Vérification que la clé API est bien une chaîne
assert isinstance(OPENAI_API_KEY, str), "OPENAI_API_KEY doit être une chaîne de caractères"

# --- Config Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# === 2. MODÈLES DE DONNÉES (POUR LES REQUÊTES ET RÉPONSES) ===

class ActionType(Enum):
    """Types d'actions que l'agent peut identifier."""
    STAKE = "stake"
    SWAP = "swap"
    BALANCE = "balance"
    VAULT = "vault"  # Nouvelle action pour les vaults
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

# === 2.5. CLASSE CRYPTO FUNCTIONS (BRIDGE VERS TYPESCRIPT) ===

class CryptoFunctions:
    """
    Classe qui appelle les vraies fonctions TypeScript via l'API REST bridge.
    Cette classe fait le pont entre l'agent Python et vos fonctions existantes.
    """
    
    def __init__(self):
        self.api_base_url = CRYPTO_BRIDGE_URL
        
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Fait un appel HTTP vers l'API TypeScript bridge.
        """
        url = f"{self.api_base_url}{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                if method.upper() == 'GET':
                    async with session.get(url) as response:
                        result = await response.json()
                        response.raise_for_status()
                        return result
                else:
                    async with session.post(url, json=data) as response:
                        result = await response.json()
                        response.raise_for_status()
                        return result
                        
        except aiohttp.ClientError as e:
            logger.error(f"Erreur de connexion à l'API TypeScript: {e}")
            return {
                "success": False,
                "error": f"Connexion à l'API impossible: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Erreur lors de l'appel API: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}"
            }
    
    async def vault_deposit(self, vault_address: str, asset_address: str, decimals: int, user_address: str, amount: float) -> Dict[str, Any]:
        """
        Appelle votre fonction depositToVault TypeScript.
        """
        logger.info(f"🏦 Appel API TypeScript pour dépôt vault: {amount} tokens dans {vault_address}")
        
        data = {
            "vaultAddress": vault_address,
            "assetAddress": asset_address,
            "decimals": decimals,
            "userAddress": user_address,
            "amount": amount
        }
        
        result = await self._make_request("POST", "/vault/deposit", data)
        
        if result.get("success"):
            logger.info(f"✅ Dépôt vault réussi via API TypeScript: {result.get('transactionHash', 'N/A')}")
            return {
                "success": True,
                "transaction_hash": result.get("transactionHash"),
                "expected_shares": result.get("expectedShares"),
                "vault_address": vault_address,
                "amount_deposited": amount,
                "message": f"Dépôt de {amount} tokens dans le vault {vault_address} exécuté avec succès !",
                "api_result": result
            }
        else:
            logger.error(f"❌ Échec du dépôt vault via API: {result.get('error', 'Erreur inconnue')}")
            return {
                "success": False,
                "error": result.get("error", "Erreur inconnue"),
                "message": f"Échec du dépôt de {amount} tokens dans le vault"
            }
    
    async def vault_withdraw(self, vault_address: str, asset_decimals: int, user_address: str, amount: float) -> Dict[str, Any]:
        """
        Appelle votre fonction withdrawFromVault TypeScript.
        """
        logger.info(f"💰 Appel API TypeScript pour retrait vault: {amount} tokens de {vault_address}")
        
        data = {
            "vaultAddress": vault_address,
            "assetDecimals": asset_decimals,
            "userAddress": user_address,
            "amount": amount
        }
        
        result = await self._make_request("POST", "/vault/withdraw", data)
        
        if result.get("success"):
            logger.info(f"✅ Retrait vault réussi via API TypeScript: {result.get('transactionHash', 'N/A')}")
            return {
                "success": True,
                "transaction_hash": result.get("transactionHash"),
                "shares_used": result.get("sharesUsed"),
                "vault_address": vault_address,
                "amount_withdrawn": amount,
                "message": f"Retrait de {amount} tokens du vault {vault_address} exécuté avec succès !",
                "api_result": result
            }
        else:
            logger.error(f"❌ Échec du retrait vault via API: {result.get('error', 'Erreur inconnue')}")
            return {
                "success": False,
                "error": result.get("error", "Erreur inconnue"),
                "message": f"Échec du retrait de {amount} tokens du vault"
            }
    
    async def vault_redeem(self, vault_address: str, user_address: str, shares: float) -> Dict[str, Any]:
        """
        Appelle votre fonction redeemFromVault TypeScript.
        """
        logger.info(f"🔄 Appel API TypeScript pour rachat shares: {shares} shares de {vault_address}")
        
        data = {
            "vaultAddress": vault_address,
            "userAddress": user_address,
            "shares": shares
        }
        
        result = await self._make_request("POST", "/vault/redeem", data)
        
        if result.get("success"):
            logger.info(f"✅ Rachat shares réussi via API TypeScript: {result.get('transactionHash', 'N/A')}")
            return {
                "success": True,
                "transaction_hash": result.get("transactionHash"),
                "assets_received": result.get("assetsReceived"),
                "vault_address": vault_address,
                "shares_redeemed": shares,
                "message": f"Rachat de {shares} shares du vault {vault_address} exécuté avec succès !",
                "api_result": result
            }
        else:
            logger.error(f"❌ Échec du rachat shares via API: {result.get('error', 'Erreur inconnue')}")
            return {
                "success": False,
                "error": result.get("error", "Erreur inconnue"),
                "message": f"Échec du rachat de {shares} shares du vault"
            }
    
    async def get_vault_info(self, vault_address: str) -> Dict[str, Any]:
        """
        Appelle votre fonction getVaultInfo TypeScript.
        """
        logger.info(f"📊 Appel API TypeScript pour infos vault: {vault_address}")
        
        result = await self._make_request("GET", f"/vault/info/{vault_address}")
        
        if result.get("success"):
            logger.info(f"✅ Infos vault récupérées via API TypeScript pour {vault_address}")
            return {
                "success": True,
                "vault_address": vault_address,
                "vault_info": result.get("vaultInfo", {}),
                "message": f"Informations du vault {vault_address} récupérées",
                "api_result": result
            }
        else:
            logger.error(f"❌ Échec récupération infos vault via API: {result.get('error', 'Erreur inconnue')}")
            return {
                "success": False,
                "error": result.get("error", "Erreur inconnue"),
                "message": f"Impossible de récupérer les infos du vault {vault_address}"
            }
    
    async def get_user_portfolio(self, user_address: str) -> Dict[str, Any]:
        """
        Appelle votre fonction getUserActiveVaults TypeScript.
        """
        logger.info(f"💼 Appel API TypeScript pour portefeuille: {user_address}")
        
        result = await self._make_request("GET", f"/vault/portfolio/{user_address}")
        
        if result.get("success"):
            logger.info(f"✅ Portefeuille récupéré via API TypeScript pour {user_address}")
            return {
                "success": True,
                "user_address": user_address,
                "active_vaults": result.get("activeVaults", []),
                "vault_count": result.get("vaultCount", 0),
                "message": f"Portefeuille de {user_address} récupéré: {result.get('vaultCount', 0)} vault(s)",
                "api_result": result
            }
        else:
            logger.error(f"❌ Échec récupération portefeuille via API: {result.get('error', 'Erreur inconnue')}")
            return {
                "success": False,
                "error": result.get("error", "Erreur inconnue"),
                "message": f"Impossible de récupérer le portefeuille de {user_address}"
            }

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
        - vault : opérations sur les vaults (paramètres: vault_action="deposit/withdraw/redeem/info/portfolio", vault_address, amount, shares)
        - conversation : discussion générale, questions, salutations.
        - unknown : intention vraiment pas claire.
        
        RÈGLES :
        - Si c'est une ACTION crypto, action_type = "stake"/"swap"/"balance"/"vault".
        - Si c'est une conversation, action_type = "conversation".
        - Incluis TOUJOURS un champ "user_response" avec une réponse naturelle et amicale.
        - Extrait les paramètres à partir de toute la conversation.
        - Les montants doivent être des nombres (float), les adresses doivent commencer par 0x.
        
        EXEMPLES VAULT :
        - "dépose 100 tokens dans le vault 0x123" -> vault_action="deposit", vault_address="0x123", amount=100.0
        - "retire 50 tokens du vault" -> vault_action="withdraw", amount=50.0
        - "montre mon portefeuille" -> vault_action="portfolio"
        - "infos sur le vault 0x456" -> vault_action="info", vault_address="0x456"
        
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
                messages=messages_for_api,  # Type ignoré pour compatibilité
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
        self.crypto_functions = CryptoFunctions()  # ✨ Nouvelle instance pour les vraies fonctions
        
        logger.info(f"Agent '{self.agent.name}' initialisé avec l'adresse : {self.agent.address}")
        logger.info(f"Serveur HTTP démarré sur http://127.0.0.1:{port}")
        logger.info(f"🔗 Bridge API TypeScript configuré sur : {CRYPTO_BRIDGE_URL}")

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
                logger.info(f"🚀 Exécution confirmée de l'action {action.action_type.value}")
                
                # ✨ EXÉCUTION DE LA VRAIE FONCTION SELON LE TYPE
                try:
                    if action.action_type == ActionType.VAULT:
                        vault_action = action.parameters.get('vault_action', 'deposit')
                        
                        if vault_action == 'deposit':
                            # 🔧 CORRECTION: Récupérer d'abord les infos du vault pour obtenir l'asset address
                            vault_address = action.parameters.get('vault_address', '0x')
                            
                            # Étape 1: Récupérer les infos du vault
                            vault_info_result = await self.crypto_functions.get_vault_info(vault_address)
                            
                            if not vault_info_result.get("success"):
                                result = {
                                    "success": False,
                                    "message": f"Impossible de récupérer les infos du vault {vault_address}: {vault_info_result.get('error', 'Erreur inconnue')}"
                                }
                            else:
                                # Extraire les informations nécessaires
                                vault_info = vault_info_result.get("vault_info", {})
                                asset_info = vault_info.get("asset", {})
                                vault_details = vault_info.get("vault", {})
                                
                                asset_address = asset_info.get("address")
                                decimals = asset_info.get("decimals", 18)
                                
                                if not asset_address:
                                    result = {
                                        "success": False,
                                        "message": f"Impossible de déterminer l'adresse de l'asset pour le vault {vault_address}"
                                    }
                                else:
                                    logger.info(f"🔍 Vault {vault_address} -> Asset {asset_address} ({asset_info.get('symbol', 'Unknown')})")
                                    
                                    # Étape 2: Effectuer le dépôt avec les bonnes informations
                                    result = await self.crypto_functions.vault_deposit(
                                        vault_address=vault_address,
                                        asset_address=asset_address,
                                        decimals=decimals,
                                        user_address=request.user_id,  # ou une vraie adresse
                                        amount=action.parameters.get('amount', 0)
                                    )
                        elif vault_action == 'withdraw':
                            # Pour le retrait, on a aussi besoin des infos du vault pour les decimals
                            vault_address = action.parameters.get('vault_address', '0x')
                            
                            logger.info(f"🔍 Récupération des infos du vault {vault_address} pour le retrait...")
                            
                            # Récupérer les infos du vault pour les decimals de l'asset
                            vault_info_result = await self.crypto_functions.get_vault_info(vault_address)
                            
                            if vault_info_result.get("success"):
                                asset_decimals = vault_info_result.get("vault_info", {}).get("asset", {}).get("decimals", 18)
                                asset_symbol = vault_info_result.get("vault_info", {}).get("asset", {}).get("symbol", "Unknown")
                                vault_name = vault_info_result.get("vault_info", {}).get("vault", {}).get("name", "Unknown Vault")
                                
                                logger.info(f"✅ Vault trouvé: {vault_name} -> Asset {asset_symbol} ({asset_decimals} decimals)")
                            else:
                                asset_decimals = 18  # Fallback
                                logger.warning(f"⚠️ Impossible de récupérer les infos du vault, utilisation de 18 decimals par défaut")
                            
                            result = await self.crypto_functions.vault_withdraw(
                                vault_address=vault_address,
                                asset_decimals=asset_decimals,
                                user_address=request.user_id,
                                amount=action.parameters.get('amount', 0)
                            )
                        elif vault_action == 'redeem':
                            result = await self.crypto_functions.vault_redeem(
                                vault_address=action.parameters.get('vault_address', '0x'),
                                user_address=request.user_id,
                                shares=action.parameters.get('shares', 0)
                            )
                        elif vault_action == 'info':
                            result = await self.crypto_functions.get_vault_info(
                                vault_address=action.parameters.get('vault_address', '0x')
                            )
                        elif vault_action == 'portfolio':
                            result = await self.crypto_functions.get_user_portfolio(
                                user_address=request.user_id
                            )
                        else:
                            result = {"success": False, "message": f"Action vault '{vault_action}' non supportée"}
                    
                    elif action.action_type == ActionType.STAKE:
                        # Pour les autres actions, vous pouvez ajouter d'autres fonctions ici
                        result = {
                            "success": True,
                            "message": f"Staking de {action.parameters.get('amount')} FLOW avec {action.parameters.get('validator')} (fonction à implémenter)"
                        }
                    
                    elif action.action_type == ActionType.SWAP:
                        # Pour les swaps, vous pouvez ajouter votre fonction de swap ici
                        result = {
                            "success": True,
                            "message": f"Swap de {action.parameters.get('amount')} {action.parameters.get('from_token')} vers {action.parameters.get('to_token')} (fonction à implémenter)"
                        }
                    
                    else:
                        result = {"success": False, "message": "Type d'action non supporté"}
                    
                    # Préparer la réponse selon le résultat
                    if result["success"]:
                        response_msg = f"🎉 Excellent ! {result['message']}"
                        if "transaction_hash" in result:
                            response_msg += f"\n\n📋 Transaction ID: `{result['transaction_hash']}`"
                        
                        response = ActionResponse(
                            success=True, 
                            message=response_msg,
                            function_result=json.dumps(result, indent=2)
                        )
                    else:
                        response = ActionResponse(
                            success=False,
                            message=f"❌ {result.get('message', 'Erreur lors de l execution')}"
                        )
                        
                except Exception as e:
                    logger.error(f"Erreur lors de l'exécution de l'action: {e}")
                    response = ActionResponse(
                        success=False,
                        message=f"❌ Erreur technique lors de l'exécution: {str(e)}"
                    )
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
        # NOUVEAU : Appel réel aux fonctions TypeScript via HTTP
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{CRYPTO_BRIDGE_URL}/execute", json={"function_call": function_call}) as resp:
                if resp.status != 200:
                    return {"success": False, "message": "Erreur lors de l'appel de la fonction TypeScript."}
                return await resp.json()

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