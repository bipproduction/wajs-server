type TYPE = "image" | "video" | "audio" | "file" | "text" | "sticker" | "document"
const message = {
    "object": "whatsapp_business_account",
    "entry": [
        {
            "id": "783866307805501",
            "changes": [
                {
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "6285801681205",
                            "phone_number_id": "919585147894728"
                        },
                        "contacts": [
                            {
                                "profile": {
                                    "name": "malik kurosaki"
                                },
                                "wa_id": "6289697338821"
                            }
                        ],
                        "messages": [
                            {
                                "from": "6289697338821",
                                "id": "wamid.HBgNNjI4OTY5NzMzODgyMRUCABIYIEFDRjdEM0Q3NERFNjhGRERBQkQ4NDAxRTEzRTAzQ0MyAA==",
                                "timestamp": "1760952787",
                                "text": {
                                    "body": "halo"
                                },
                                "type": "text" as TYPE
                            }
                        ]
                    },
                    "field": "messages"
                }
            ]
        }
    ]
}

export type WAHookMessage = typeof message