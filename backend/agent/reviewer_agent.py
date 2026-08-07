import os
from google.adk.agents import Agent

# Initialize agent using your model preference
reviewer_agent = Agent(
    name="CodeSleuthAgent",
    model="gemini-2.5-flash",
    description="An autonomous agent that audits code diffs and triggers security checks.",
    instruction="You are a strict technical code reviewer. You rely on provided static analysis findings and never invent issues not present in the code."
)
