from app.config import get_settings
from typing import AsyncGenerator

PROVIDERS = {
    "anthropic": {
        "models": ["claude-sonnet-4-6", "claude-opus-4-5", "claude-haiku-3-5"],
        "default": "claude-sonnet-4-6",
    },
    "openai": {
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
        "default": "gpt-4o",
    },
    "gemini": {
        "models": ["gemini-1.5-pro", "gemini-1.5-flash"],
        "default": "gemini-1.5-pro",
    },
    "athena": {
        "models": ["claude-sonnet-4-6", "gpt-4o", "gemini-1.5-pro"],
        "default": "claude-sonnet-4-6",
    },
}

def _build_prompt(context: dict) -> str:
    event         = context.get("event", {})
    country_stats = context.get("countryStats", {})
    total         = context.get("totalEvents", 0)

    lines = [
        "You are an intelligence analyst specialising in global conflict analysis.",
        "",
        "Provide a concise, factual intelligence summary for the following conflict event:",
        "",
        f"**Event:** {event.get('type', 'Unknown')} / {event.get('subtype', '')}",
        f"**Location:** {event.get('country', 'Unknown')} ({event.get('lat', '')}, {event.get('lng', '')})",
        f"**Date:** {event.get('date', 'Unknown')}",
        f"**Fatalities:** {event.get('fatalities', 0)}",
        f"**Actors:** {event.get('actor1', 'N/A')} vs {event.get('actor2', 'N/A')}",
        f"**Source:** {event.get('source', 'Unknown')}",
        f"**Notes:** {str(event.get('notes', 'None'))[:300]}",
        "",
        f"**Country Context:** {country_stats.get('count', 0)} total events, "
        f"{country_stats.get('fatalities', 0)} total fatalities in dataset.",
        "",
        "Provide:",
        "1. **Situation Assessment** - What is happening and why it matters",
        "2. **Key Actors** - Brief profile of involved parties",
        "3. **Regional Impact** - Humanitarian and geopolitical implications",
        "4. **Trend** - Is this escalating, de-escalating, or stable?",
        "",
        "Keep the response concise (under 300 words). Use markdown formatting.",
    ]
    return "\n".join(lines)


async def stream_analysis(context: dict, provider: str, model: str) -> AsyncGenerator[str, None]:
    s = get_settings()
    prompt = _build_prompt(context)

    if provider == "anthropic":
        async for chunk in _stream_anthropic(prompt, model, s.gcas_anthropic_key):
            yield chunk
    elif provider == "openai":
        async for chunk in _stream_openai_compat(
            prompt, model, s.gcas_openai_key, "https://api.openai.com/v1"
        ):
            yield chunk
    elif provider == "gemini":
        async for chunk in _stream_gemini(prompt, model, s.gcas_gemini_key):
            yield chunk
    elif provider == "athena":
        async for chunk in _stream_openai_compat(
            prompt, model, s.gcas_athena_key, s.gcas_athena_base_url
        ):
            yield chunk
    else:
        yield f"Unknown provider: {provider}"


async def _stream_anthropic(prompt: str, model: str, api_key: str) -> AsyncGenerator[str, None]:
    if not api_key:
        yield "Warning: Anthropic API key not configured. Please add gcas_anthropic_key to Secret Manager."
        return
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        async with client.messages.stream(
            model=model,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
    except Exception as e:
        yield f"\n\nAnthropic error: {str(e)}"


async def _stream_openai_compat(
    prompt: str, model: str, api_key: str, base_url: str
) -> AsyncGenerator[str, None]:
    if not api_key:
        yield "Warning: API key not configured for this provider. Please add the key to Secret Manager."
        return
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        stream = await client.chat.completions.create(
            model=model,
            max_tokens=600,
            stream=True,
            messages=[{"role": "user", "content": prompt}],
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta
    except Exception as e:
        yield f"\n\nProvider error: {str(e)}"


async def _stream_gemini(prompt: str, model: str, api_key: str) -> AsyncGenerator[str, None]:
    if not api_key:
        yield "Warning: Gemini API key not configured. Please add gcas_gemini_key to Secret Manager."
        return
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        gmodel = genai.GenerativeModel(model)
        response = gmodel.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\nGemini error: {str(e)}"
