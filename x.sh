
#!/bin/bash
TOKEN="EAALP22EWyC4BPv7XnK1xSaZCWccblEoJFbHzPZAf5mlp4678lSM7cqhQl1ExATf8abrOpinvvFF6U6ruK2FsJqIk8wg6DiUz2fc0NYfcwjon3ng7I3C5HSDQHecgTiJLUBxfZAcvE4IIlhks722jakXaJpojlByo8QJ0CEURtzwEU1guFq7YTX3Et0ZCkbhkdftZCOGmpUKFjL5w5nUdd26Nd58YrLVZCoT8NKhxpWFQZDZD"
curl -i -X POST \
  https://graph.facebook.com/v22.0/838757782652201/messages \
  -H 'Authorization: Bearer $TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "messaging_product": "whatsapp", "to": "6289505046093", "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }'