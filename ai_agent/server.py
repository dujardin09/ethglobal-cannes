import json
from datetime import datetime
from uuid import uuid4
import os
import httpx

async def get_completion(context: str, prompt: str):
    print(f"LLM a reçu le prompt : {prompt}")
    api_key = os.getenv("FETCHAI_API_KEY")
    if not api_key:
        raise ValueError("La clé API Fetch.ai n'est pas définie dans l'environnement (FETCHAI_API_KEY)")

    url = "https://api.fetch.ai/v1/asi1/generate"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "asi1",
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()

from uagents_core.contrib.protocols.chat import ChatMessage, ChatAcknowledgement, TextContent, chat_protocol_spec
from uagents import Agent, Context, Protocol

chat_proto = Protocol(spec=chat_protocol_spec)


agent = Agent(
    name="asi-server-agent",
    seed="ergqregqtrhtqrh4354534535ksjw",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
)

@agent.on_event("startup")
async def on_startup(ctx: Context):
    print("[TRACE] = ENTER IN = on_startup")
    
    ctx.logger.info(f"Agent serveur démarré avec l'adresse : {agent.address}")

@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    print("[TRACE] = ENTER IN = handle_message")
    
    if msg.content and isinstance(msg.content[0], TextContent):
        prompt = msg.content[0].text
        ctx.logger.info(f"Got a message from {sender}: {prompt}")
    else:
        ctx.logger.warning(f"Got a message from {sender} with non-text content: {msg.content}")
        prompt = None
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )
    if prompt:
        await send_response_to_client(ctx, sender, prompt)

async def send_response_to_client(ctx: Context, sender: str, prompt: str):
    print("[TRACE] = ENTER IN = send_response_to_client")
    try:
        completion = await get_completion(context="", prompt=prompt)
        if isinstance(completion, dict):
            data = completion
            print(f"\n[DEBUG] Completion (dict) reçu: {data}\n")
        else:
            data = json.loads(completion)
            print(f"\n[DEBUG] Completion (json) reçu: {data}\n")
        content = data["choices"][0]["message"]["content"]

    except json.JSONDecodeError as e:
        error_msg = f"Erreur de décodage JSON: {e}"
        ctx.logger.error(error_msg)
        content = "Désolé, j'ai reçu une réponse mal formée du service de langue."
    except (KeyError, IndexError) as e:
        error_msg = f"Structure de réponse inattendue: {e}. Données reçues: {data}"
        ctx.logger.error(error_msg)
        content = "Désolé, je n'ai pas pu extraire la réponse du service de langue."
    except Exception as e:
        error_msg = f"Une erreur inattendue est survenue: {e}"
        ctx.logger.error(error_msg)
        content = "Une erreur est survenue lors de la génération de la réponse."

    await ctx.send(sender, ChatMessage(
        timestamp=datetime.now(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=content)],
    ))

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    print("[TRACE] = ENTER IN = handle_ack")
    ctx.logger.info(f"Got an acknowledgement from {sender} for {msg.acknowledged_msg_id}")

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()