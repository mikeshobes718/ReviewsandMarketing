import os
from typing import Optional

from openai import OpenAI


def make_client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key)


def transcribe_file(client: OpenAI, file_path: str, model: str = "whisper-1") -> str:
    with open(file_path, "rb") as f:
        resp = client.audio.transcriptions.create(model=model, file=f)
    # SDK returns a typed object with .text
    return getattr(resp, "text", "").strip()


def chat_complete(
    client: OpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
) -> str:
    resp = client.chat.completions.create(
        model=model,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    if resp.choices and resp.choices[0].message and resp.choices[0].message.content:
        return resp.choices[0].message.content.strip()
    return ""

