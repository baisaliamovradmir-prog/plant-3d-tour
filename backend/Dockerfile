FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 app
COPY --chown=app:app . .
RUN mkdir -p media staticfiles && chown app:app media staticfiles
USER app
EXPOSE 8000
CMD ["sh", "deploy/start.sh"]
