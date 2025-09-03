from textwrap import dedent


def build_system_prompt(style: str = "Concise") -> str:
    base = dedent(
        """
        You are an interview assistant that drafts succinct, high-quality answers.
        Output 3 numbered suggestions. Keep each under 2 sentences unless depth is essential.
        Be direct, professional, and specific. Avoid fluff.
        """
    ).strip()
    if style.lower() == "star":
        base += "\nUse STAR framing where helpful (Situation, Task, Action, Result)."
    elif style.lower() == "technical":
        base += "\nBias towards technical depth, tradeoffs, and concrete examples."
    return base


def build_user_prompt(transcript: str) -> str:
    return dedent(f"""
        Interviewer said (transcribed):
        {transcript}

        Draft 3 candidate replies for me to say next.
        Format:
        1) ...
        2) ...
        3) ...
    """).strip()
