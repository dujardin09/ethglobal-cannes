#!/usr/bin/env python3
"""
API REST Simple pour tester l'agent Flow sans uAgents

Cette API expose les mêmes fonctionnalités que l'agent uAgents
mais via des endpoints REST classiques pour les tests avec curl.
"""

import asyncio
import json
import os
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import des classes de votre agent
from agent_special import FlowCryptoAI, ActionType, ParsedAction

app = FastAPI(title="Flow Crypto Agent API", version="1.0.0")

# Configuration CORS pour permettre les requêtes depuis le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("La variable d'environnement OPENAI_API_KEY doit être définie.")

# Instance de l'IA
ai = FlowCryptoAI(OPENAI_API_KEY)

# Stockage en mémoire des conversations et actions en attente
conversation_histories: Dict[str, list] = {}
pending_actions: Dict[str, ParsedAction] = {}

# === MODÈLES PYDANTIC ===

class UserMessage(BaseModel):
    content: str
    user_id: str

class ConfirmationMessage(BaseModel):
    action_id: str
    confirmed: bool
    user_id: str

class ActionResponse(BaseModel):
    success: bool
    message: str
    function_call: Optional[str] = None
    function_result: Optional[str] = None
    requires_confirmation: bool = False
    action_id: Optional[str] = None

# === ENDPOINTS ===

@app.get("/")
async def root():
    """Endpoint de santé"""
    return {"status": "OK", "message": "Flow Crypto Agent API is running"}

@app.get("/health")
async def health():
    """Vérification de l'état de l'API"""
    return {
        "status": "healthy",
        "openai_configured": OPENAI_API_KEY is not None,
        "active_conversations": len(conversation_histories),
        "pending_actions": len(pending_actions)
    }

@app.post("/chat")
async def chat(message: UserMessage) -> ActionResponse:
    """
    Endpoint principal pour envoyer un message à l'agent
    Compatible avec curl et JSON classique
    """
    try:
        print(f"🔥 MESSAGE REÇU: {message.content} (user: {message.user_id})")
        
        # Récupérer l'historique de conversation
        history = conversation_histories.get(message.user_id, [])
        print(f"📚 Historique: {len(history)} messages")
        
        # Ajouter le nouveau message
        history.append({"role": "user", "content": message.content})
        history = history[-10:]  # Garder seulement les 10 derniers
        
        # Analyser avec l'IA
        print("🤖 Analyse IA en cours...")
        parsed_action, raw_json = await ai.analyze_message(history)
        print(f"✅ Action: {parsed_action.action_type} (confiance: {parsed_action.confidence})")
        print(f"📝 Paramètres: {parsed_action.parameters}")
        
        # Traiter selon le type d'action
        if parsed_action.action_type in [ActionType.CONVERSATION, ActionType.UNKNOWN] or parsed_action.confidence < 0.7:
            print("💬 Réponse conversationnelle")
            response = ActionResponse(
                success=True,
                message=parsed_action.user_response,
                requires_confirmation=False
            )
        else:
            print("⚡ Action crypto détectée")
            response = await process_crypto_action(parsed_action, message.user_id)
        
        # Sauvegarder dans l'historique
        history.append({"role": "assistant", "content": response.message})
        conversation_histories[message.user_id] = history[-10:]
        
        print(f"📤 Réponse: {response.message[:100]}...")
        return response
        
    except Exception as e:
        print(f"❌ ERREUR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")

@app.post("/confirm")
async def confirm_action(confirmation: ConfirmationMessage) -> ActionResponse:
    """
    Endpoint pour confirmer ou annuler une action
    """
    try:
        print(f"🔔 CONFIRMATION: {confirmation.action_id} = {confirmation.confirmed}")
        
        # Récupérer l'action en attente
        action = pending_actions.pop(confirmation.action_id, None)
        if not action:
            raise HTTPException(status_code=404, detail="Action non trouvée ou expirée")
        
        if confirmation.confirmed:
            print("✅ Action confirmée")
            function_call = generate_function_call(action)
            message = f"Parfait ! Votre action '{action.action_type.value}' a été confirmée et est en cours d'exécution.\n\nAppel de fonction : `{function_call}`\n\nSimulation d'exécution réussie !"
            response = ActionResponse(
                success=True,
                message=message,
                function_call=function_call,
                function_result='{"success": true, "message": "Simulation réussie"}'
            )
        else:
            print("❌ Action annulée")
            response = ActionResponse(
                success=True,
                message="Action annulée. N'hésitez pas si vous avez besoin d'autre chose !"
            )
        
        # Mettre à jour l'historique
        history = conversation_histories.get(confirmation.user_id, [])
        history.append({"role": "user", "content": "oui" if confirmation.confirmed else "non"})
        history.append({"role": "assistant", "content": response.message})
        conversation_histories[confirmation.user_id] = history[-10:]
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERREUR confirmation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la confirmation: {str(e)}")

@app.get("/conversation/{user_id}")
async def get_conversation(user_id: str):
    """Récupérer l'historique de conversation d'un utilisateur"""
    history = conversation_histories.get(user_id, [])
    return {
        "user_id": user_id,
        "history": history,
        "message_count": len(history)
    }

@app.delete("/conversation/{user_id}")
async def clear_conversation(user_id: str):
    """Effacer l'historique de conversation d'un utilisateur"""
    if user_id in conversation_histories:
        del conversation_histories[user_id]
        return {"message": f"Historique effacé pour {user_id}"}
    else:
        return {"message": f"Aucun historique trouvé pour {user_id}"}

@app.get("/pending_actions")
async def get_pending_actions():
    """Lister toutes les actions en attente"""
    return {
        "pending_actions": [
            {
                "action_id": action_id,
                "action_type": action.action_type.value,
                "parameters": action.parameters,
                "confidence": action.confidence
            }
            for action_id, action in pending_actions.items()
        ]
    }

# === FONCTIONS UTILITAIRES ===

async def process_crypto_action(action: ParsedAction, user_id: str) -> ActionResponse:
    """Traite une action crypto (stake, swap, balance)"""
    
    # Validation simple
    validation_error = validate_action_parameters(action)
    if validation_error:
        return ActionResponse(success=False, message=validation_error)
    
    # Si c'est un balance check, pas besoin de confirmation
    if action.action_type == ActionType.BALANCE:
        function_call = generate_function_call(action)
        return ActionResponse(
            success=True,
            message=f"{action.user_response}\n\nAppel de fonction : `{function_call}`",
            function_call=function_call,
            function_result='{"balance": "1234.56 FLOW", "success": true}'
        )
    
    # Pour stake/swap, demander confirmation
    action_id = f"{user_id}_{os.urandom(4).hex()}"
    pending_actions[action_id] = action
    
    confirmation_prompt = generate_confirmation_message(action)
    full_message = f"{action.user_response}\n\n{confirmation_prompt}"
    
    return ActionResponse(
        success=True,
        message=full_message,
        requires_confirmation=True,
        action_id=action_id
    )

def validate_action_parameters(action: ParsedAction) -> str:
    """Valide les paramètres d'une action"""
    if action.action_type == ActionType.STAKE:
        if not action.parameters.get("amount"):
            return "❌ Montant manquant pour le staking"
        if not action.parameters.get("validator"):
            return "❌ Validateur manquant pour le staking"
    
    elif action.action_type == ActionType.SWAP:
        if not action.parameters.get("amount"):
            return "❌ Montant manquant pour le swap"
        if not action.parameters.get("from_token"):
            return "❌ Token source manquant pour le swap"
        if not action.parameters.get("to_token"):
            return "❌ Token destination manquant pour le swap"
    
    elif action.action_type == ActionType.BALANCE:
        # Pas de validation stricte pour balance
        pass
    
    return ""

def generate_confirmation_message(action: ParsedAction) -> str:
    """Génère un message de confirmation pour une action"""
    if action.action_type == ActionType.STAKE:
        params = action.parameters
        return f"⚠️ Confirmation requise : Staker {params.get('amount')} FLOW avec le validateur {params.get('validator')} ? (oui/non)"
    
    elif action.action_type == ActionType.SWAP:
        params = action.parameters
        return f"⚠️ Confirmation requise : Échanger {params.get('amount')} {params.get('from_token')} contre {params.get('to_token')} ? (oui/non)"
    
    return "⚠️ Confirmez-vous cette action ? (oui/non)"

def generate_function_call(action: ParsedAction) -> str:
    """Génère l'appel de fonction pour une action"""
    if action.action_type == ActionType.STAKE:
        params = action.parameters
        return f"stake_tokens({params.get('amount')}, \"{params.get('validator')}\")"
    
    elif action.action_type == ActionType.SWAP:
        params = action.parameters
        return f"swap_tokens(\"{params.get('from_token')}\", \"{params.get('to_token')}\", {params.get('amount')})"
    
    elif action.action_type == ActionType.BALANCE:
        wallet = action.parameters.get('wallet_address', 'user_wallet')
        return f"check_balance(\"{wallet}\")"
    
    return "fonction_inconnue()"

# === DÉMARRAGE DU SERVEUR ===

if __name__ == "__main__":
    print("🚀 Démarrage de l'API REST Flow Crypto Agent")
    print("📍 URL: http://127.0.0.1:8002")
    print("📚 Documentation: http://127.0.0.1:8002/docs")
    print("🔧 Health check: http://127.0.0.1:8002/health")
    
    uvicorn.run(
        "simple_api:app",
        host="127.0.0.1",
        port=8002,
        reload=True,
        log_level="info"
    )
