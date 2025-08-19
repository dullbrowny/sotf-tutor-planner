# load your server key
export TOGETHER_API_KEY=$(grep -E '^TOGETHER_API_KEY=' .env.local | cut -d= -f2-)

# test an embedding call
curl -s https://api.together.xyz/v1/embeddings \
  -H "Authorization: Bearer $TOGETHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"intfloat/multilingual-e5-large-instruct","input":["hello world"]}' | jq '.data[0].embedding | length'
# -> should print a dimension (e.g., 1024, 768, etc.)

