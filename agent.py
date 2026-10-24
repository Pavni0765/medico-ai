import os
from datetime import datetime
from uuid import uuid4

from openai import OpenAI
from uagents import Context, Protocol, Agent
from uagents.experimental.chat_agent.protocol import build_llm_message_history
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)

##
### Example Expert Assistant - Medico AI
##
## This chat example attaches a chat protocol to an agent
## and customizes its behavior for Medico AI (Essential Medicine Availability & Shortage Coordination).
##

def create_text_chat(text: str, end_session: bool = False) -> ChatMessage:
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(timestamp=datetime.utcnow(), msg_id=uuid4(), content=content)

# the subject that this assistant is an expert in
subject_matter = "Essential Medicine Availability, Hospital Shortage Coordination, and Pharmacy Inventory (Medico AI)"

SYSTEM_PROMPT = (
    f"You are Medico AI (MedStock AI), an expert assistant who only answers questions about {subject_matter}. "
    "You help clinics, hospitals, and pharmacies check stock of essential NLEM medicines (such as Ceftriaxone 1g, Meropenem 1g, Insulin, Paracetamol), "
    "coordinate urgent stockouts, rank nearby verified suppliers, and draft emergency RFQs. "
    "Clinical safety rule: Strictly never recommend unauthorized drug substitutions without a physician's prescription. "
    "All prices should be in Indian Rupees (INR ₹). "
    "If the user asks about any other topics, you should politely say that you do not know about them and redirect to medicine stock coordination."
)

# Agentverse injects both variables into Hosted Agents, so no API key is needed here.
# Running outside Agentverse? Set them yourself, using a key from https://asi1.ai/developer
client = OpenAI(
    base_url=os.environ["ASI1_BASE_URL"],
    api_key=os.environ["ASI1_API_KEY"],
)

agent = Agent()

# We create a new protocol which is compatible with the chat protocol spec. This ensures
# compatibility between agents
protocol = Protocol(spec=chat_protocol_spec)


# We define the handler for the chat messages that are sent to your agent
@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    # send the acknowledgement for receiving the message
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )

    text = msg.text()
    if not text:
        return

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *build_llm_message_history(ctx),
    ]

    try:
        r = client.chat.completions.create(
            model="asi1",
            messages=messages,
            max_tokens=2048,
        )

        response = str(r.choices[0].message.content)
    except Exception as e:
        ctx.logger.exception('Error querying model')
        response = f"An error occurred while processing the request. Please try again later. {e}"

    await ctx.send(sender, create_text_chat(response))


@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    # we are not interested in the acknowledgements for this example, but they can be useful to
    # implement read receipts, for example.
    pass


# attach the protocol to the agent
agent.include(protocol, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
