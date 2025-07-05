from datetime import datetime
from uuid import uuid4
from uagents import Agent, Context
from uagents_core.contrib.protocols.chat import ChatMessage, ChatAcknowledgement, TextContent
import sys

AI_AGENT_ADDRESS = "agent1qtz34mlwf4spnmjqsgj7amp8xdh67rhgfy6kj6f97pd9ldmpzfyeched3jt"

agent = Agent(
    name="asi-client",
    seed="hiweihvhieivhwehihiweivbw;ibv;rikbv;erv;rkkbv",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
)

@agent.on_event("startup")
async def initiate_chat(ctx: Context):
    print("[TRACE] = ENTER IN = initiate_chat")
    message_text = "who is president of US"
    ctx.logger.info(f"Sending message to server: '{message_text}'")
    await ctx.send(AI_AGENT_ADDRESS, ChatMessage(
        timestamp=datetime.now(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=message_text)],
    ))

@agent.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    print("[TRACE] = ENTER IN = handle_ack")
    ctx.logger.info(f"Got an acknowledgement from {sender} for {msg.acknowledged_msg_id}")

@agent.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    print("[TRACE] = ENTER IN = handle_chat_message")
    
    if msg.content and isinstance(msg.content[0], TextContent):
        # CORRECTION : Utilisation de f-string et message de sortie plus clair
        response_text = msg.content[0].text
        print(f"\n[RÉPONSE DU SERVEUR] : {response_text}\n")
    else:
        ctx.logger.warning(f"Received non-text message: {msg.content}")

    ctx.logger.info("Task complete. Shutting down client agent.")

if __name__ == "__main__":
    agent.run()