{
  "indexes": [
    {
      "collectionGroup": "directMessagesMetadata",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "participantUids",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "lastMessage.timestamp",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "dms",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "participantUids",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "lastMessageTimestamp",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "games",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "finishedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "read",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "recipientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "rooms",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "voiceParticipantsCount",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "comments",
      "fieldPath": "createdAt",
      "ttl": false,
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        },
        {
          "order": "DESCENDING",
          "queryScope": "COLLECTION"
        },
        {
          "arrayConfig": "CONTAINS",
          "queryScope": "COLLECTION"
        },
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION_GROUP"
        }
      ]
    }
  ]
}