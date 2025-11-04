FROM python:3.13-slim-bookworm

# Install system dependencies including curl for uv installer and PostgreSQL client libraries
RUN apt-get update && apt-get install --no-install-recommends -y \
        build-essential \
        curl \
        libpq-dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv
ADD https://astral.sh/uv/install.sh /install.sh
RUN chmod -R 755 /install.sh && /install.sh && rm /install.sh

# Set up the UV environment path correctly
ENV PATH="/root/.local/bin:${PATH}"

# Prevent uv from trying to use hardlinks (which can cause issues in Docker)
ENV UV_LINK_MODE=copy

WORKDIR /app

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install dependencies (this creates the virtual environment)
RUN uv sync --frozen --no-dev

# Copy the rest of the application (excluding .venv due to .dockerignore)
COPY . .

# Expose the specified port for FastAPI
EXPOSE 80

# Use uv run to execute the app (it handles the virtual environment automatically)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]