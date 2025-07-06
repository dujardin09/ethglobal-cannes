# -*- coding: utf-8 -*-
"""
Crypto Flow Agent with AI, Conversation Memory, and REST Endpoints

This script deploys a uAgents agent capable of understanding user intentions
related to operations on the Flow blockchain and maintaining a contextual conversation.
It exposes REST endpoints for easy integration with web clients.

Execution Modes:
1. Official Mode (default): python flow_agent.py
   - Launches the uAgents agent with REST endpoints on http://127.0.0.1:8001.

2. Interactive Mode: python flow_agent.py interactive
   - Launches a command-line interface to chat directly with the agent's AI logic.

3. Test Mode: python flow_agent.py test
   - Executes a predefined test scenario to validate the AI's conversation memory.
"""

# === 1. IMPORTS AND CONFIGURATION ===
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
import aiohttp  # New import for HTTP requests
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low

# --- General Configuration ---
AGENT_SEED = "flow_crypto_agent_final_seed_rest" # Changed seed slightly to avoid conflicts
AGENT_PORT = 8001
# AGENT_ENDPOINT is no longer needed for REST-only agents, but kept for context.
AGENT_ENDPOINT = [f"http://127.0.0.1:{AGENT_PORT}/submit"]
MAX_HISTORY_LENGTH = 10
CRYPTO_FUNCTIONS_DIR = "crypto_functions"

# --- TypeScript Bridge API Configuration ---
CRYPTO_BRIDGE_URL = "http://localhost:3003/api"

# --- OpenAI Configuration ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("The OPENAI_API_KEY environment variable must be set.")

# Assurer que la clé API est bien une chaîne non-nulle
assert OPENAI_API_KEY is not None and isinstance(OPENAI_API_KEY, str), "OPENAI_API_KEY doit être une chaîne de caractères non vide"

# --- Logging Config ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# === 2. DATA MODELS (FOR REQUESTS AND RESPONSES) ===

class ActionType(Enum):
    """Types of actions the agent can identify."""
    STAKE = "stake"
    SWAP = "swap"
    BALANCE = "balance"
    VAULT = "vault"  # New action for vaults
    CONVERSATION = "conversation"
    UNKNOWN = "unknown"

@dataclass
class ParsedAction:
    """Structure to store the result of the AI analysis."""
    action_type: ActionType
    confidence: float
    parameters: Dict[str, Any]
    raw_message: str
    user_response: str = ""

# --- Models for REST requests ---
class UserMessage(Model):
    """Request body for the /talk endpoint."""
    content: str
    user_id: str

class ConfirmationMessage(Model):
    """Request body for the /confirm endpoint."""
    action_id: str
    confirmed: bool
    user_id: str

# --- Model for REST responses ---
class ActionResponse(Model):
    """Response body for all endpoints."""
    success: bool
    message: str
    function_call: Optional[str] = None
    function_result: Optional[str] = None
    requires_confirmation: bool = False
    action_id: Optional[str] = None

# === 2.5. CRYPTO FUNCTIONS CLASS (BRIDGE TO TYPESCRIPT) ===

class CryptoFunctions:
    """
    Class that calls the actual TypeScript functions via the REST API bridge.
    This class bridges the gap between the Python agent and your existing functions.
    """
    
    def __init__(self):
        self.api_base_url = CRYPTO_BRIDGE_URL
        
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Makes an HTTP call to the TypeScript bridge API.
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
            logger.error(f"TypeScript API connection error: {e}")
            return {
                "success": False,
                "error": f"API connection impossible: {str(e)}"
            }
        except Exception as e:
            logger.error(f"API call error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}"
            }
    
    async def vault_deposit(self, vault_address: str, asset_address: str, decimals: int, user_address: str, amount: float) -> Dict[str, Any]:
        """
        Calls your depositToVault TypeScript function.
        """
        logger.info(f"🏦 TypeScript API call for vault deposit: {amount} tokens into {vault_address}")
        
        data = {
            "vaultAddress": vault_address,
            "assetAddress": asset_address,
            "decimals": decimals,
            "userAddress": user_address,
            "amount": amount
        }
        
        result = await self._make_request("POST", "/vault/deposit", data)
        
        if result.get("success"):
            logger.info(f"✅ Vault deposit successful via TypeScript API: {result.get('transactionHash', 'N/A')}")
            return {
                "success": True,
                "transaction_hash": result.get("transactionHash"),
                "expected_shares": result.get("expectedShares"),
                "vault_address": vault_address,
                "amount_deposited": amount,
                "message": f"Deposit of {amount} tokens into vault {vault_address} executed successfully!",
                "api_result": result
            }
        else:
            logger.error(f"❌ Vault deposit failed via API: {result.get('error', 'Unknown error')}")
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "message": f"Failed to deposit {amount} tokens into the vault"
            }
    
    async def vault_withdraw(self, vault_address: str, asset_decimals: int, user_address: str, amount: float) -> Dict[str, Any]:
        """
        Calls your withdrawFromVault TypeScript function.
        """
        logger.info(f"💰 TypeScript API call for vault withdrawal: {amount} tokens from {vault_address}")
        
        data = {
            "vaultAddress": vault_address,
            "assetDecimals": asset_decimals,
            "userAddress": user_address,
            "amount": amount
        }
        
        result = await self._make_request("POST", "/vault/withdraw", data)
        
        if result.get("success"):
            logger.info(f"✅ Vault withdrawal successful via TypeScript API: {result.get('transactionHash', 'N/A')}")
            return {
                "success": True,
                "transaction_hash": result.get("transactionHash"),
                "shares_used": result.get("sharesUsed"),
                "vault_address": vault_address,
                "amount_withdrawn": amount,
                "message": f"Withdrawal of {amount} tokens from vault {vault_address} executed successfully!",
                "api_result": result
            }
        else:
            logger.error(f"❌ Vault withdrawal failed via API: {result.get('error', 'Unknown error')}")
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "message": f"Failed to withdraw {amount} tokens from the vault"
            }
    
    async def vault_redeem(self, vault_address: str, user_address: str, shares: float) -> Dict[str, Any]:
        """
        Calls your redeemFromVault TypeScript function.
        """
        logger.info(f"🔄 TypeScript API call for share redemption: {shares} shares from {vault_address}")
        
        data = {
            "vaultAddress": vault_address,
            "userAddress": user_address,
            "shares": shares
        }
        
        result = await self._make_request("POST", "/vault/redeem", data)
        
        if result.get("success"):
            logger.info(f"✅ Share redemption successful via TypeScript API: {result.get('transactionHash', 'N/A')}")
            return {
                "success": True,
                "transaction_hash": result.get("transactionHash"),
                "assets_received": result.get("assetsReceived"),
                "vault_address": vault_address,
                "shares_redeemed": shares,
                "message": f"Redemption of {shares} shares from vault {vault_address} executed successfully!",
                "api_result": result
            }
        else:
            logger.error(f"❌ Share redemption failed via API: {result.get('error', 'Unknown error')}")
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "message": f"Failed to redeem {shares} shares from the vault"
            }
    
    async def get_vault_info(self, vault_address: str) -> Dict[str, Any]:
        """
        Calls your getVaultInfo TypeScript function.
        """
        logger.info(f"📊 TypeScript API call for vault info: {vault_address}")
        
        result = await self._make_request("GET", f"/vault/info/{vault_address}")
        
        if result.get("success"):
            logger.info(f"✅ Vault info retrieved via TypeScript API for {vault_address}")
            return {
                "success": True,
                "vault_address": vault_address,
                "vault_info": result.get("vaultInfo", {}),
                "message": f"Information for vault {vault_address} retrieved",
                "api_result": result
            }
        else:
            logger.error(f"❌ Failed to retrieve vault info via API: {result.get('error', 'Unknown error')}")
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "message": f"Unable to retrieve info for vault {vault_address}"
            }
    
    async def get_user_portfolio(self, user_address: str) -> Dict[str, Any]:
        """
        Calls your getUserActiveVaults TypeScript function.
        """
        logger.info(f"💼 TypeScript API call for portfolio: {user_address}")
        
        result = await self._make_request("GET", f"/vault/portfolio/{user_address}")
        
        if result.get("success"):
            logger.info(f"✅ Portfolio retrieved via TypeScript API for {user_address}")
            return {
                "success": True,
                "user_address": user_address,
                "active_vaults": result.get("activeVaults", []),
                "vault_count": result.get("vaultCount", 0),
                "message": f"Portfolio for {user_address} retrieved: {result.get('vaultCount', 0)} vault(s)",
                "api_result": result
            }
        else:
            logger.error(f"❌ Failed to retrieve portfolio via API: {result.get('error', 'Unknown error')}")
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "message": f"Unable to retrieve portfolio for {user_address}"
            }
    
    # === FONCTIONS DE SWAP ===
    
    async def get_available_tokens(self) -> Dict[str, Any]:
        """
        Récupère la liste des tokens disponibles pour le swap.
        """
        logger.info(f"🔍 Récupération des tokens disponibles via l'API de swap")
        
        # Utiliser l'API de swap du frontend au lieu du bridge TypeScript
        swap_api_url = "http://localhost:3000/api"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{swap_api_url}/tokens") as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("tokens"):
                        logger.info(f"✅ {len(result['tokens'])} tokens disponibles récupérés")
                        return {
                            "success": True,
                            "tokens": result["tokens"],
                            "message": f"{len(result['tokens'])} tokens disponibles pour le swap"
                        }
                    else:
                        return {
                            "success": False,
                            "error": "Aucun token trouvé",
                            "message": "Aucun token disponible pour le swap"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des tokens: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": "Impossible de récupérer les tokens disponibles"
            }
    
    async def get_user_balances(self, user_address: str) -> Dict[str, Any]:
        """
        Récupère les balances de tokens d'un utilisateur.
        """
        logger.info(f"💰 Récupération des balances pour: {user_address}")
        
        swap_api_url = "http://localhost:3000/api"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{swap_api_url}/tokens/balances?userAddress={user_address}") as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("balances"):
                        logger.info(f"✅ Balances récupérées pour {user_address}")
                        return {
                            "success": True,
                            "balances": result["balances"],
                            "metadata": result.get("metadata", {}),
                            "message": f"Balances récupérées pour {user_address}"
                        }
                    else:
                        return {
                            "success": False,
                            "error": "Aucune balance trouvée",
                            "message": f"Impossible de récupérer les balances pour {user_address}"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des balances: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": f"Impossible de récupérer les balances pour {user_address}"
            }
    
    async def get_swap_quote(self, token_in_address: str, token_out_address: str, amount_in: str) -> Dict[str, Any]:
        """
        Obtient un devis de swap entre deux tokens.
        """
        logger.info(f"📊 Demande de devis swap: {amount_in} de {token_in_address} vers {token_out_address}")
        
        swap_api_url = "http://localhost:3000/api"
        
        data = {
            "tokenInAddress": token_in_address,
            "tokenOutAddress": token_out_address,
            "amountIn": amount_in
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{swap_api_url}/swap/quote", json=data) as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("quote"):
                        quote = result["quote"]
                        logger.info(f"✅ Devis obtenu: {quote['amountOut']} tokens de sortie")
                        return {
                            "success": True,
                            "quote": quote,
                            "message": f"Devis de swap obtenu: {quote['amountIn']} {quote['tokenIn']['symbol']} → {quote['amountOut']} {quote['tokenOut']['symbol']}"
                        }
                    else:
                        return {
                            "success": False,
                            "error": result.get("error", "Impossible de générer le devis"),
                            "message": "Impossible d'obtenir un devis pour ce swap"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de la demande de devis: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": "Impossible d'obtenir un devis de swap"
            }
    
    async def execute_swap(self, quote_id: str, user_address: str, slippage_tolerance: float = 0.5) -> Dict[str, Any]:
        """
        Exécute un swap en utilisant un devis existant.
        """
        logger.info(f"🔄 Exécution du swap {quote_id} pour {user_address} avec slippage {slippage_tolerance}%")
        
        swap_api_url = "http://localhost:3000/api"
        
        data = {
            "quoteId": quote_id,
            "userAddress": user_address,
            "slippageTolerance": slippage_tolerance
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{swap_api_url}/swap/execute", json=data) as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("transaction"):
                        transaction = result["transaction"]
                        logger.info(f"✅ Swap exécuté avec succès: {transaction.get('id', 'N/A')}")
                        return {
                            "success": True,
                            "transaction": transaction,
                            "transaction_id": transaction.get("id"),
                            "transaction_hash": transaction.get("hash"),
                            "status": transaction.get("status"),
                            "message": f"Swap exécuté avec succès ! Transaction ID: {transaction.get('id', 'N/A')}"
                        }
                    else:
                        return {
                            "success": False,
                            "error": result.get("error", "Échec de l'exécution"),
                            "message": "Échec de l'exécution du swap"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de l'exécution du swap: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": "Erreur lors de l'exécution du swap"
            }
    
    async def perform_complete_swap(self, token_in_symbol: str, token_out_symbol: str, amount_in: str, user_address: str, slippage_tolerance: float = 0.5) -> Dict[str, Any]:
        """
        Effectue un swap complet en une seule fonction : récupère les tokens, obtient un devis et exécute le swap.
        """
        logger.info(f"🚀 Début du swap complet: {amount_in} {token_in_symbol} → {token_out_symbol} pour {user_address}")
        
        try:
            # 1. Récupérer les tokens disponibles
            tokens_result = await self.get_available_tokens()
            if not tokens_result["success"]:
                return tokens_result
            
            tokens = tokens_result["tokens"]
            
            # 2. Trouver les adresses des tokens par leurs symboles
            token_in = None
            token_out = None
            
            for token in tokens:
                if token["symbol"].upper() == token_in_symbol.upper():
                    token_in = token
                if token["symbol"].upper() == token_out_symbol.upper():
                    token_out = token
            
            if not token_in:
                return {
                    "success": False,
                    "error": f"Token {token_in_symbol} non trouvé",
                    "message": f"Le token {token_in_symbol} n'est pas disponible pour le swap"
                }
            
            if not token_out:
                return {
                    "success": False,
                    "error": f"Token {token_out_symbol} non trouvé",
                    "message": f"Le token {token_out_symbol} n'est pas disponible pour le swap"
                }
            
            # 3. Vérifier les balances de l'utilisateur
            balances_result = await self.get_user_balances(user_address)
            if balances_result["success"]:
                user_balance = balances_result["balances"].get(token_in["address"], "0")
                # Nettoyer les données mock si présentes
                if user_balance.startswith("MOCK_"):
                    user_balance = user_balance.replace("MOCK_", "")
                
                if float(user_balance) < float(amount_in):
                    return {
                        "success": False,
                        "error": f"Balance insuffisante",
                        "message": f"Balance insuffisante: {user_balance} {token_in_symbol} disponible, {amount_in} requis"
                    }
            
            # 4. Obtenir un devis
            quote_result = await self.get_swap_quote(token_in["address"], token_out["address"], amount_in)
            if not quote_result["success"]:
                return quote_result
            
            quote = quote_result["quote"]
            
            # 5. Exécuter le swap
            execute_result = await self.execute_swap(quote["id"], user_address, slippage_tolerance)
            
            if execute_result["success"]:
                return {
                    "success": True,
                    "quote": quote,
                    "transaction": execute_result["transaction"],
                    "transaction_id": execute_result["transaction_id"],
                    "transaction_hash": execute_result["transaction_hash"],
                    "message": f"Swap réussi ! {amount_in} {token_in_symbol} → {quote['amountOut']} {token_out_symbol}. Transaction: {execute_result['transaction_id']}"
                }
            else:
                return execute_result
                
        except Exception as e:
            logger.error(f"Erreur lors du swap complet: {e}")
            return {
                "success": False,
                "error": f"Erreur: {str(e)}",
                "message": "Erreur lors du swap complet"
            }
    
    # === FONCTIONS DE STAKING ===
    
    async def setup_staking_collection(self, user_address: str) -> Dict[str, Any]:
        """
        Configure la collection de staking pour un utilisateur.
        """
        logger.info(f"🏗️ Configuration de la collection de staking pour: {user_address}")
        
        swap_api_url = "http://localhost:3000/api"
        
        data = {
            "userAddress": user_address
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{swap_api_url}/stake/setup", json=data) as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("success"):
                        logger.info(f"✅ Collection de staking configurée pour {user_address}")
                        return {
                            "success": True,
                            "transaction_id": result.get("transactionId"),
                            "status": result.get("status"),
                            "message": f"Collection de staking configurée avec succès pour {user_address}"
                        }
                    else:
                        return {
                            "success": False,
                            "error": result.get("error", "Échec de la configuration"),
                            "message": "Impossible de configurer la collection de staking"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de la configuration du staking: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": "Erreur lors de la configuration du staking"
            }
    
    async def get_delegator_info(self, user_address: str) -> Dict[str, Any]:
        """
        Récupère les informations des délégateurs pour un utilisateur.
        """
        logger.info(f"📊 Récupération des infos délégateurs pour: {user_address}")
        
        swap_api_url = "http://localhost:3000/api"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{swap_api_url}/stake/delegator-info?userAddress={user_address}") as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("success"):
                        logger.info(f"✅ Infos délégateurs récupérées pour {user_address}")
                        return {
                            "success": True,
                            "delegator_info": result.get("delegatorInfo", []),
                            "message": f"Informations des délégateurs récupérées pour {user_address}"
                        }
                    else:
                        return {
                            "success": False,
                            "error": result.get("error", "Aucune info trouvée"),
                            "message": f"Impossible de récupérer les infos délégateurs pour {user_address}"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des infos délégateurs: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": f"Erreur lors de la récupération des infos délégateurs pour {user_address}"
            }
    
    async def execute_stake(self, user_address: str, amount: str, node_id: Optional[str] = None, delegator_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Exécute une opération de staking.
        """
        logger.info(f"🥩 Exécution du staking: {amount} FLOW pour {user_address}")
        
        swap_api_url = "http://localhost:3000/api"
        
        data = {
            "userAddress": user_address,
            "amount": amount
        }
        
        if node_id:
            data["nodeID"] = node_id
        if delegator_id:
            data["delegatorID"] = str(delegator_id)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{swap_api_url}/stake/execute", json=data) as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("success"):
                        logger.info(f"✅ Staking exécuté avec succès: {result.get('transactionId', 'N/A')}")
                        return {
                            "success": True,
                            "transaction_id": result.get("transactionId"),
                            "transaction_hash": result.get("transactionHash"),
                            "amount_staked": result.get("amount"),
                            "validator": result.get("nodeID", "Default Validator"),
                            "estimated_rewards": result.get("estimatedRewards"),
                            "staking_details": result.get("stakingDetails", {}),
                            "message": f"Staking de {amount} FLOW exécuté avec succès ! Récompenses estimées: {result.get('estimatedRewards', 'N/A')} FLOW/an"
                        }
                    else:
                        return {
                            "success": False,
                            "error": result.get("error", "Échec du staking"),
                            "message": "Échec de l'exécution du staking"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de l'exécution du staking: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": "Erreur lors de l'exécution du staking"
            }
    
    async def get_staking_status(self, user_address: str) -> Dict[str, Any]:
        """
        Récupère le statut de staking d'un utilisateur.
        """
        logger.info(f"📈 Récupération du statut de staking pour: {user_address}")
        
        swap_api_url = "http://localhost:3000/api"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{swap_api_url}/stake/status?userAddress={user_address}") as response:
                    result = await response.json()
                    response.raise_for_status()
                    
                    if result.get("success"):
                        staking_status = result.get("stakingStatus", {})
                        logger.info(f"✅ Statut de staking récupéré pour {user_address}")
                        return {
                            "success": True,
                            "staking_status": staking_status,
                            "total_staked": staking_status.get("totalStaked", "0"),
                            "total_rewards": staking_status.get("totalRewards", "0"),
                            "active_stakes": staking_status.get("activeStakes", []),
                            "network_info": staking_status.get("networkInfo", {}),
                            "message": f"Statut de staking: {staking_status.get('totalStaked', '0')} FLOW stakés, {staking_status.get('totalRewards', '0')} FLOW de récompenses"
                        }
                    else:
                        return {
                            "success": False,
                            "error": result.get("error", "Aucun statut trouvé"),
                            "message": f"Impossible de récupérer le statut de staking pour {user_address}"
                        }
                        
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du statut de staking: {e}")
            return {
                "success": False,
                "error": f"Erreur API: {str(e)}",
                "message": f"Erreur lors de la récupération du statut de staking pour {user_address}"
            }
    
    async def perform_complete_stake(self, user_address: str, amount: str, validator: str = None) -> Dict[str, Any]:
        """
        Effectue un staking complet : configure la collection si nécessaire, puis exécute le staking.
        """
        logger.info(f"🚀 Début du staking complet: {amount} FLOW pour {user_address}")
        
        try:
            # 1. Vérifier d'abord le statut de staking existant
            status_result = await self.get_staking_status(user_address)
            
            # 2. Si pas de staking existant, configurer la collection
            if not status_result["success"] or not status_result.get("active_stakes"):
                logger.info("🏗️ Configuration de la collection de staking...")
                setup_result = await self.setup_staking_collection(user_address)
                if not setup_result["success"]:
                    return {
                        "success": False,
                        "error": "Échec de la configuration du staking",
                        "message": f"Impossible de configurer le staking: {setup_result.get('error', 'Erreur inconnue')}"
                    }
            
            # 3. Récupérer les infos des délégateurs
            delegator_result = await self.get_delegator_info(user_address)
            
            # 4. Exécuter le staking
            node_id = None
            delegator_id = None
            
            if delegator_result["success"] and delegator_result.get("delegator_info"):
                # Utiliser un délégateur existant
                delegator_info = delegator_result["delegator_info"][0]
                node_id = delegator_info.get("nodeID")
                delegator_id = delegator_info.get("id")
                logger.info(f"🔍 Utilisation du délégateur existant: {delegator_id}")
            
            # Si un validateur spécifique est demandé, l'utiliser
            if validator and validator.lower() != "default":
                # Map des validateurs connus
                validator_map = {
                    "blocto": "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
                    "benjamin": "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
                    "flow": "flow_foundation_node_id"
                }
                node_id = validator_map.get(validator.lower(), node_id)
            
            stake_result = await self.execute_stake(user_address, amount, node_id, delegator_id)
            
            if stake_result["success"]:
                return {
                    "success": True,
                    "transaction_id": stake_result["transaction_id"],
                    "transaction_hash": stake_result["transaction_hash"],
                    "amount_staked": stake_result["amount_staked"],
                    "validator": validator or "Benjamin Van Meter",
                    "estimated_rewards": stake_result["estimated_rewards"],
                    "message": f"Staking réussi ! {amount} FLOW stakés avec {validator or 'le validateur par défaut'}. Récompenses estimées: {stake_result.get('estimated_rewards', 'N/A')} FLOW/an"
                }
            else:
                return stake_result
                
        except Exception as e:
            logger.error(f"Erreur lors du staking complet: {e}")
            return {
                "success": False,
                "error": f"Erreur: {str(e)}",
                "message": "Erreur lors du staking complet"
            }

# === 3. ARTIFICIAL INTELLIGENCE CLASS ===

class FlowCryptoAI:
    """
    Class managing interactions with the LLM to analyze messages.
    """
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.system_prompt = """
        You are a crypto assistant specialized in intent analysis for a Flow platform.
        Your role is to analyze the user's latest message in the context of the provided conversation history.
        Use the context to understand follow-up questions and complete missing information.

        DETECTABLE CRYPTO ACTIONS:
            stake: staking of tokens (parameters: amount, validator)
            swap: token exchange (parameters: from_token, to_token, amount)
            balance: balance check (parameters: wallet_address)
            vault: vault operations (parameters: vault_action="deposit/withdraw/redeem/info/portfolio", vault_address, amount, shares)
            conversation: general discussion, questions, greetings.
            unknown: really unclear intent.

        RULES:
            If it's a crypto ACTION, action_type = "stake"/"swap"/"balance"/"vault".
            If it's a conversation, action_type = "conversation".
            ALWAYS include a "user_response" field with a natural and friendly reply.
            Extract parameters from the entire conversation.
            Amounts must be numbers (float), addresses must start with 0x.
        VAULT EXAMPLES:
            "deposit 100 tokens into vault 0x123" → vault_action="deposit", vault_address="0x123", amount=100.0
            "withdraw 50 tokens from the vault" → vault_action="withdraw", amount=50.0
            "show my portfolio" → vault_action="portfolio"
            "info about vault 0x456" → vault_action="info", vault_address="0x456"

        EXAMPLE OUTPUT JSON:
        {
            "action_type": "stake",
            "confidence": 0.95,
            "parameters": {"amount": 150.0, "validator": "blocto"},
            "user_response": "Perfect! I'll prepare the staking of 150 FLOW with the Blocto validator for you."
        }
Always return a valid JSON object with these fields.
        """
    async def analyze_message(self, history: List[Dict[str, str]]) -> Tuple[ParsedAction, str]:
        """
        Analyzes a user message with the AI using conversation history.
        Returns the parsed action and the raw LLM response.
        """
        if not history:
            return ParsedAction(ActionType.UNKNOWN, 0.0, {}, "", "Empty history."), ""

        last_user_message = history[-1]['content']
        # Convertir l'historique au format attendu par OpenAI
        messages_for_api = [{"role": "system", "content": self.system_prompt}]
        for msg in history:
            messages_for_api.append({"role": msg["role"], "content": msg["content"]})

        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-4o-mini",
                messages=messages_for_api,  # Type ignored for compatibility
                temperature=0.1,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if not content:
                raise ValueError("LLM response is empty.")
            
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
            logger.error(f"Error during AI analysis: {e}")
            fallback_response = "I didn't quite understand. Could you rephrase? I can help with staking, swapping, or checking a balance."
            return ParsedAction(
                action_type=ActionType.CONVERSATION,
                confidence=0.5,
                parameters={},
                raw_message=last_user_message,
                user_response=fallback_response
            ), ""

# === 4. uAGENTS AGENT CLASS WITH REST ENDPOINTS ===

class FlowCryptoAgent:
    """
    uAgents agent that handles business logic, memory, and crypto function execution.
    Exposes REST endpoints for interaction.
    """
    def __init__(self, name: str, seed: str, port: int, api_key: str):
        self.agent = Agent(name=name, seed=seed, port=port)
        self.ai = FlowCryptoAI(api_key)
        self.pending_actions: Dict[str, ParsedAction] = {}
        self.conversation_histories: Dict[str, List[Dict[str, str]]] = {}
        self.crypto_functions = CryptoFunctions()  # ✨ New instance for real functions
        
        logger.info(f"Agent '{self.agent.name}' initialized with address: {self.agent.address}")
        logger.info(f"HTTP server started on http://127.0.0.1:{port}")
        logger.info(f"🔗 TypeScript API bridge configured on: {CRYPTO_BRIDGE_URL}")

        os.makedirs(CRYPTO_FUNCTIONS_DIR, exist_ok=True)
        self.initialize_typescript_functions()
        
        self.register_handlers()
        fund_agent_if_low(str(self.agent.wallet.address()))

    def register_handlers(self):
        """Registers REST request handlers for the agent."""
        
        # MODIFICATION: Replaced on_message with on_rest_post
        @self.agent.on_rest_post("/talk", UserMessage, ActionResponse)
        async def handle_talk_request(ctx: Context, request: UserMessage) -> ActionResponse:
            """
            Main endpoint for conversation.
            Takes user message and ID as input.
            """
            ctx.logger.info(f"Request received on /talk from user: {request.user_id}")
            
            # Internal logic remains the same
            history = self.conversation_histories.get(request.user_id, [])
            history.append({"role": "user", "content": request.content})
            history = history[-MAX_HISTORY_LENGTH:]

            parsed_action, _ = await self.ai.analyze_message(history)
            
            # Log for debugging
            logger.info(f"Detected action: {parsed_action.action_type.value}, Confidence: {parsed_action.confidence:.2f}")
            logger.info(f"Parameters: {parsed_action.parameters}")
            
            # Improved logic: be more permissive with confirmations
            # Critical actions that always require confirmation
            critical_actions = [ActionType.STAKE, ActionType.SWAP, ActionType.VAULT]
            
            if parsed_action.action_type in critical_actions:
                logger.info(f"Critical action detected - confirmation required")
                response = await self.process_action(parsed_action, request.user_id)
            elif parsed_action.action_type in [ActionType.CONVERSATION, ActionType.UNKNOWN] or parsed_action.confidence < 0.3:
                logger.info(f"Action classified as conversation or low confidence - no confirmation")
                response = ActionResponse(
                    success=True,
                    message=parsed_action.user_response,
                    requires_confirmation=False
                )
            else:
                logger.info(f"Action requires confirmation - calling process_action")
                response = await self.process_action(parsed_action, request.user_id)
            
            history.append({"role": "assistant", "content": response.message})
            self.conversation_histories[request.user_id] = history[-MAX_HISTORY_LENGTH:]
            
            # MODIFICATION: Return the response directly instead of ctx.send()
            return response
        
        # MODIFICATION: New handler for confirmation via REST
        @self.agent.on_rest_post("/confirm", ConfirmationMessage, ActionResponse)
        async def handle_confirmation_request(ctx: Context, request: ConfirmationMessage) -> ActionResponse:
            """
            Endpoint to confirm or cancel a pending action.
            """
            ctx.logger.info(f"Confirmation request received on /confirm for action: {request.action_id}")
            
            action = self.pending_actions.pop(request.action_id, None)
            if not action:
                return ActionResponse(success=False, message="Action not found or expired.")

            if request.confirmed:
                logger.info(f"🚀 Confirmed execution of action {action.action_type.value}")
                
                # ✨ EXECUTE THE REAL FUNCTION BASED ON TYPE
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
                            result = {"success": False, "message": f"Vault action '{vault_action}' not supported"}
                    
                    elif action.action_type == ActionType.STAKE:
                        # ✨ EXÉCUTION RÉELLE DU STAKING avec vos API
                        amount = action.parameters.get('amount', 0)
                        validator = action.parameters.get('validator', 'default')
                        
                        logger.info(f"🥩 Début du staking: {amount} FLOW avec {validator}")
                        
                        # Utiliser la fonction de staking complet
                        result = await self.crypto_functions.perform_complete_stake(
                            user_address=request.user_id,
                            amount=str(amount),
                            validator=validator
                        )
                    
                    elif action.action_type == ActionType.SWAP:
                        # ✨ EXÉCUTION RÉELLE DU SWAP avec vos API
                        from_token = action.parameters.get('from_token', '')
                        to_token = action.parameters.get('to_token', '')
                        amount = action.parameters.get('amount', 0)
                        slippage = action.parameters.get('slippage', 0.5)
                        
                        logger.info(f"🔄 Début du swap: {amount} {from_token} → {to_token}")
                        
                        # Utiliser la fonction de swap complet
                        result = await self.crypto_functions.perform_complete_swap(
                            token_in_symbol=from_token,
                            token_out_symbol=to_token,
                            amount_in=str(amount),
                            user_address=request.user_id,
                            slippage_tolerance=slippage
                        )
                    
                    else:
                        result = {"success": False, "message": "Action type not supported"}
                    
                    # Prepare response based on the result
                    if result["success"]:
                        response_msg = f"🎉 Excellent! {result['message']}"
                        if "transaction_hash" in result:
                            response_msg += f"\n\n📋 Transaction ID: `{result['transaction_hash']}`"
                        
                        # Generate function_call for formatting
                        function_call = self.generate_function_call(action)
                        
                        response = ActionResponse(
                            success=True, 
                            message=response_msg,
                            function_call=function_call,
                            function_result=json.dumps(result, indent=2)
                        )
                    else:
                        response = ActionResponse(
                            success=False,
                            message=f"❌ {result.get('message', 'Error during execution')}"
                        )
                        
                except Exception as e:
                    logger.error(f"Error during action execution: {e}")
                    response = ActionResponse(
                        success=False,
                        message=f"❌ Technical error during execution: {str(e)}"
                    )
            else:
                logger.info(f"Action {request.action_id} cancelled by {request.user_id}.")
                response = ActionResponse(success=True, message="Action cancelled. Feel free to ask if you need anything else!")
            
            history = self.conversation_histories.get(request.user_id, [])
            history.append({"role": "user", "content": "yes" if request.confirmed else "no"})
            history.append({"role": "assistant", "content": response.message})
            self.conversation_histories[request.user_id] = history[-MAX_HISTORY_LENGTH:]
            
            # MODIFICATION: Return the response directly
            return response

    async def process_action(self, action: ParsedAction, user_id: str) -> ActionResponse:
        """Validates and processes a crypto action (stake, swap, balance)."""
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
        # Unchanged validation logic
        return None
    
    def generate_confirmation_message(self, action: ParsedAction) -> str:
        # Unchanged message generation logic
        if action.action_type == ActionType.STAKE:
            params = action.parameters
            return f"⚠️ Confirmation required: Stake {params.get('amount')} FLOW with the {params.get('validator')} validator? Respond to the /confirm endpoint."
        return "Do you confirm this action? Respond to the /confirm endpoint."

    def generate_function_call(self, action: ParsedAction) -> str:
        # Unchanged function call generation logic
        if action.action_type == ActionType.STAKE:
            params = action.parameters
            return f"stake_tokens({params.get('amount')}, \"{params.get('validator')}\")"
        if action.action_type == ActionType.BALANCE:
            return f"check_balance(\"{action.parameters.get('wallet_address')}\")"
        return "unknown_function()"

    def initialize_typescript_functions(self):
        pass

    async def execute_typescript_function(self, function_call: str, action: ParsedAction) -> Dict[str, Any]:
        # NEW: Actual call to TypeScript functions via HTTP
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{CRYPTO_BRIDGE_URL}/execute", json={"function_call": function_call}) as resp:
                if resp.status != 200:
                    return {"success": False, "message": "Error calling the TypeScript function."}
                return await resp.json()

    def run(self):
        """Launches the agent's lifecycle."""
        self.agent.run()

# === 5. EXECUTION MODES (INTERACTIVE, TEST, OFFICIAL) ===

async def run_interactive_mode():
    """Launches an interactive console chat to test the AI logic."""
    print("--- Interactive Mode ---")
    print("Chat with the agent's AI. Type 'quit' to exit, 'new' to reset memory.")
    
    ai = FlowCryptoAI(OPENAI_API_KEY)
    history: List[Dict[str, str]] = []

    while True:
        try:
            user_input = input("\nYou > ")
            if user_input.lower() == 'quit':
                break
            if user_input.lower() == 'new':
                history = []
                print("\n[Memory reset]")
                continue

            history.append({"role": "user", "content": user_input})
            
            print("[AI analysis in progress...]")
            parsed_action, raw_json = await ai.analyze_message(history)
            
            print("\n--- AI Analysis ---")
            print(f"Action: {parsed_action.action_type.value} (Confidence: {parsed_action.confidence:.2f})")
            print(f"Parameters: {parsed_action.parameters}")
            print(f"Raw JSON: {raw_json}")
            print("-----------------------")
            
            print(f"\nAgent > {parsed_action.user_response}")
            history.append({"role": "assistant", "content": parsed_action.user_response})

        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error(f"An error occurred in interactive mode: {e}")
    print("\n--- End of interactive mode ---")

async def run_test_mode():
    """Executes a test scenario to check the AI's memory."""
    print("--- Test Mode: Conversational Memory Scenario ---")
    ai = FlowCryptoAI(OPENAI_API_KEY)
    
    try:
        # Step 1: User provides partial information
        history_step1 = [{"role": "user", "content": "I want to stake 150 FLOW"}]
        print(f"\n1. User: \"{history_step1[0]['content']}\"")
        parsed1, _ = await ai.analyze_message(history_step1)
        print(f"   -> AI Response: \"{parsed1.user_response}\"")
        print(f"   -> Extracted parameters: {parsed1.parameters}")
        assert parsed1.action_type == ActionType.STAKE
        assert "validator" not in parsed1.parameters

        history_step2 = history_step1 + [
            {"role": "assistant", "content": parsed1.user_response},
            {"role": "user", "content": "with the blocto validator"}
        ]
        print(f"\n2. User: \"{history_step2[-1]['content']}\" (after the agent's question)")
        parsed2, _ = await ai.analyze_message(history_step2)
        print(f"   -> AI Response: \"{parsed2.user_response}\"")
        print(f"   -> Final parameters: {parsed2.parameters}")
        assert parsed2.parameters.get("amount") == 150.0
        assert parsed2.parameters.get("validator") == "blocto"
        
        print("\n[✓] Memory scenario test successful!")

    except Exception as e:
        print(f"\n[✗] The test failed: {e}")
    
    print("\n--- End of test mode ---")


def main():
    """Main entry point of the script."""
    if "interactive" in sys.argv:
        asyncio.run(run_interactive_mode())
    elif "test" in sys.argv:
        asyncio.run(run_test_mode())
    else:
        print("--- Official Mode (REST) ---")
        print(f"Launching uAgents agent on port {AGENT_PORT}. Ready to receive HTTP requests.")
        
        # MODIFICATION: Instructions to use REST endpoints
        print("\nAvailable Endpoints:")
        print(f"  - POST http://127.0.0.1:{AGENT_PORT}/talk")
        print(f"  - POST http://127.0.0.1:{AGENT_PORT}/confirm")
        
        print("\nExample request to talk to the agent (replace user_id):")
        print(f"  curl -X POST -H \"Content-Type: application/json\" -d '{{\"content\": \"Hi!\", \"user_id\": \"user123\"}}' http://127.0.0.1:{AGENT_PORT}/talk")
        
        print("\nExample request to confirm an action (replace values):")
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