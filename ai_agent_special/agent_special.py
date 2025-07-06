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

# Verify that the API key is a string
assert isinstance(OPENAI_API_KEY, str), "OPENAI_API_KEY must be a string"

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
        messages_for_api = [{"role": "system", "content": self.system_prompt}] + history

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
                            result = await self.crypto_functions.vault_deposit(
                                vault_address=action.parameters.get('vault_address', '0x'),
                                asset_address=action.parameters.get('asset_address', '0x'),
                                decimals=action.parameters.get('decimals', 18),
                                user_address=request.user_id,  # or a real address
                                amount=action.parameters.get('amount', 0)
                            )
                        elif vault_action == 'withdraw':
                            result = await self.crypto_functions.vault_withdraw(
                                vault_address=action.parameters.get('vault_address', '0x'),
                                asset_decimals=action.parameters.get('decimals', 18),
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
                        # For other actions, you can add more functions here
                        result = {
                            "success": True,
                            "message": f"Staking {action.parameters.get('amount')} FLOW with {action.parameters.get('validator')} (function to be implemented)"
                        }
                    
                    elif action.action_type == ActionType.SWAP:
                        # For swaps, you can add your swap function here
                        result = {
                            "success": True,
                            "message": f"Swapping {action.parameters.get('amount')} {action.parameters.get('from_token')} to {action.parameters.get('to_token')} (function to be implemented)"
                        }
                    
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