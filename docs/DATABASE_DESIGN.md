# Bolt Blocker - NoSQL Database Schema Documentation

## Overview

Bolt Blocker uses a hybrid NoSQL storage architecture combining Chrome Extension Storage API for local data and Firebase Firestore for cloud synchronization. The design prioritizes offline functionality with optional cloud backup and multi-device sync capabilities.

## Storage Architecture

### Local Storage (Chrome Extension API)
- **Primary Storage**: Chrome Storage Local API (key-value pairs)
- **Capacity**: ~5MB local storage limit per extension
- **Sync Storage**: Chrome Storage Sync API (~100KB) for lightweight settings
- **Format**: JSON objects stored as values with string keys

### Cloud Storage (Firebase Firestore)
- **Purpose**: Cross-device synchronization and backup
- **Structure**: Document-based NoSQL database
- **Path Pattern**: `users/{uid}/data/{dataType}`
- **Sync Strategy**: Timestamp-based conflict resolution

## Firestore Collection Hierarchy

```
firestore/
└── users/
    └── {uid}/
        └── data/
            ├── settings          (document)
            ├── categorySites     (document)
            ├── categoryMetadata  (document)
            └── analytics         (document)
```

## JSON Schema Definitions

### Settings Document

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "_id",
      "syncEnabled",
      "unifiedModeEnabled",
      "focusCategoryId",
      "soundNotificationsEnabled",
      "notificationVolume",
      "darkModeEnabled",
      "updatedAt"
    ],
    "properties": {
      "_id": {
        "bsonType": "objectId"
      },
      "syncEnabled": {
        "bsonType": "bool",
        "description": "Whether cloud synchronization is enabled"
      },
      "unifiedModeEnabled": {
        "bsonType": "bool",
        "description": "Whether timer-blocking integration is active"
      },
      "focusCategoryId": {
        "bsonType": "string",
        "description": "Category ID to activate during focus sessions"
      },
      "breakCategoryId": {
        "bsonType": ["string", "null"],
        "description": "Optional category ID for break periods"
      },
      "soundNotificationsEnabled": {
        "bsonType": "bool",
        "description": "Whether audio notifications are enabled"
      },
      "notificationVolume": {
        "bsonType": "int",
        "minimum": 0,
        "maximum": 100,
        "description": "Notification volume percentage"
      },
      "darkModeEnabled": {
        "bsonType": "bool",
        "description": "Whether dark mode UI is enabled"
      },
      "updatedAt": {
        "bsonType": "date",
        "description": "Last modification timestamp for sync resolution"
      }
    }
  }
}
```

*Figure 1: Settings schema*

### Category Sites Document

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["_id", "updatedAt"],
    "properties": {
      "_id": {
        "bsonType": "objectId"
      },
      "patternProperties": {
        "^[a-zA-Z0-9_-]+$": {
          "bsonType": "object",
          "required": ["sites", "enabled"],
          "properties": {
            "sites": {
              "bsonType": "array",
              "items": {
                "bsonType": "string",
                "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                "description": "Valid domain name"
              },
              "description": "Array of website domains in this category"
            },
            "enabled": {
              "bsonType": "bool",
              "description": "Whether this category is currently blocking sites"
            }
          }
        }
      },
      "updatedAt": {
        "bsonType": "date",
        "description": "Last modification timestamp for sync resolution"
      }
    }
  }
}
```

*Figure 2: Category Sites schema*

### Category Metadata Document

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["_id", "updatedAt"],
    "properties": {
      "_id": {
        "bsonType": "objectId"
      },
      "patternProperties": {
        "^[a-zA-Z0-9_-]+$": {
          "bsonType": "object",
          "required": ["name", "description", "icon", "color"],
          "properties": {
            "name": {
              "bsonType": "string",
              "minLength": 1,
              "maxLength": 50,
              "description": "Human-readable category name"
            },
            "description": {
              "bsonType": "string",
              "maxLength": 200,
              "description": "Category description for users"
            },
            "icon": {
              "bsonType": "string",
              "pattern": "^.{1,4}$",
              "description": "Emoji or Unicode icon character"
            },
            "color": {
              "bsonType": "string",
              "pattern": "^#[0-9a-fA-F]{6}$",
              "description": "Hex color code for category theming"
            }
          }
        }
      },
      "updatedAt": {
        "bsonType": "date",
        "description": "Last modification timestamp for sync resolution"
      }
    }
  }
}
```

*Figure 3: Category Metadata schema*

### Analytics Document

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["_id", "sessions", "byDay", "updatedAt"],
    "properties": {
      "_id": {
        "bsonType": "objectId"
      },
      "sessions": {
        "bsonType": "array",
        "maxItems": 1000,
        "items": {
          "bsonType": "object",
          "required": ["id", "start", "type", "completed"],
          "properties": {
            "id": {
              "bsonType": "string",
              "pattern": "^[0-9]+-[a-zA-Z0-9]{6}$",
              "description": "Unique session identifier"
            },
            "start": {
              "bsonType": "date",
              "description": "Session start timestamp"
            },
            "end": {
              "bsonType": ["date", "null"],
              "description": "Session end timestamp (null if incomplete)"
            },
            "type": {
              "bsonType": "string",
              "enum": ["pomodoro", "short-break", "long-break", "custom"],
              "description": "Type of timer session"
            },
            "plannedSec": {
              "bsonType": ["int", "null"],
              "minimum": 1,
              "description": "Planned session duration in seconds"
            },
            "actualSec": {
              "bsonType": ["int", "null"],
              "minimum": 1,
              "description": "Actual session duration in seconds"
            },
            "completed": {
              "bsonType": "bool",
              "description": "Whether session was completed successfully"
            }
          }
        }
      },
      "byDay": {
        "bsonType": "object",
        "patternProperties": {
          "^[0-9]{4}-[0-9]{2}-[0-9]{2}$": {
            "bsonType": "object",
            "required": ["focusSeconds", "sessionsStarted", "sessionsCompleted", "sitesBlocked"],
            "properties": {
              "focusSeconds": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Total focus time in seconds for this day"
              },
              "sessionsStarted": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Number of sessions started this day"
              },
              "sessionsCompleted": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Number of sessions completed this day"
              },
              "sitesBlocked": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Number of site blocking events this day"
              }
            }
          }
        },
        "description": "Daily aggregated metrics by date key"
      },
      "updatedAt": {
        "bsonType": "date",
        "description": "Last modification timestamp for sync resolution"
      }
    }
  }
}
```

*Figure 4: Analytics schema*

## Chrome Storage Schemas

### Timer State Document (Local Only)

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "isRunning",
      "currentSession",
      "timeLeft",
      "totalTime",
      "sessionCount",
      "pomodoroCount",
      "sessions"
    ],
    "properties": {
      "isRunning": {
        "bsonType": "bool",
        "description": "Whether timer is currently active"
      },
      "currentSession": {
        "bsonType": "string",
        "enum": ["pomodoro", "short-break", "long-break", "custom"],
        "description": "Current session type"
      },
      "timeLeft": {
        "bsonType": "int",
        "minimum": 0,
        "description": "Remaining time in seconds"
      },
      "totalTime": {
        "bsonType": "int",
        "minimum": 1,
        "description": "Total session duration in seconds"
      },
      "startTimestamp": {
        "bsonType": ["date", "null"],
        "description": "Session start time (null when not running)"
      },
      "endTimestamp": {
        "bsonType": ["date", "null"],
        "description": "Calculated session end time"
      },
      "sessionCount": {
        "bsonType": "int",
        "minimum": 1,
        "description": "Current session number in cycle"
      },
      "pomodoroCount": {
        "bsonType": "int",
        "minimum": 0,
        "description": "Completed pomodoro sessions today"
      },
      "sessions": {
        "bsonType": "object",
        "required": ["pomodoro", "short-break", "long-break", "custom"],
        "properties": {
          "pomodoro": {
            "bsonType": "object",
            "required": ["duration", "label"],
            "properties": {
              "duration": {
                "bsonType": "int",
                "minimum": 1,
                "description": "Session duration in seconds"
              },
              "label": {
                "bsonType": "string",
                "description": "Display label for session type"
              }
            }
          },
          "short-break": {
            "bsonType": "object",
            "required": ["duration", "label"],
            "properties": {
              "duration": {
                "bsonType": "int",
                "minimum": 1
              },
              "label": {
                "bsonType": "string"
              }
            }
          },
          "long-break": {
            "bsonType": "object",
            "required": ["duration", "label"],
            "properties": {
              "duration": {
                "bsonType": "int",
                "minimum": 1
              },
              "label": {
                "bsonType": "string"
              }
            }
          },
          "custom": {
            "bsonType": "object",
            "required": ["duration", "label"],
            "properties": {
              "duration": {
                "bsonType": "int",
                "minimum": 1
              },
              "label": {
                "bsonType": "string"
              }
            }
          }
        },
        "description": "Session type configurations"
      }
    }
  }
}
```

*Figure 5: Timer State schema (Chrome Storage Local)*

## Data Relationships and References

### Reference Patterns in NoSQL Architecture

Since this is a document-based NoSQL system, traditional foreign key relationships don't exist. Instead, the application uses **reference patterns**:

#### 1. Settings → Categories
```javascript
// Settings document references category by ID
"focusCategoryId": "work-focus"  // References category key in categorySites
"breakCategoryId": "social-media"  // Optional reference
```

#### 2. Timer Sessions → Categories  
```javascript
// Analytics sessions can reference which category was active
"categoryUsed": "study-mode"  // References category that was active during session
```

#### 3. Category Sites ↔ Category Metadata
```javascript
// Both documents use same category ID as key
categorySites: {
  "work-focus": { sites: [...], enabled: true }
}
categoryMetadata: {
  "work-focus": { name: "Work Focus", icon: "💼", ... }
}
```

### Data Consistency Patterns

#### 1. Eventual Consistency (Cloud Sync)
- Local storage is authoritative for real-time operations
- Cloud storage provides backup and cross-device sync
- Conflicts resolved by `updatedAt` timestamp (last-write-wins)

#### 2. Referential Integrity (Application Level)
- Category deletion removes references in settings
- Orphaned category references fallback to default values
- No cascading deletes (sessions preserve category references for analytics)

#### 3. Data Validation (Client Side)
- JSON Schema validation on write operations
- Domain name validation for website entries
- Required field enforcement before sync

## Sync Strategy and Conflict Resolution

### Timestamp-Based Conflict Resolution
```javascript
function mergeDocuments(localDoc, cloudDoc) {
  if (!localDoc && !cloudDoc) return null;
  if (localDoc && !cloudDoc) return localDoc;
  if (!localDoc && cloudDoc) return cloudDoc;
  
  const localTime = localDoc.updatedAt || 0;
  const cloudTime = cloudDoc.updatedAt || 0;
  
  return localTime >= cloudTime ? localDoc : cloudDoc;
}
```

### Sync Process Flow
1. **Local Change** → Update local storage + set `updatedAt`
2. **Debounced Push** → Send to Firestore after 500ms delay
3. **Periodic Pull** → Check Firestore for remote changes every 30s
4. **Conflict Resolution** → Apply timestamp-based merge
5. **UI Update** → Broadcast changes to all extension interfaces

## Document Examples

### Example Settings Document
```json
{
  "_id": "user_settings",
  "syncEnabled": true,
  "unifiedModeEnabled": false,
  "focusCategoryId": "work-focus",
  "breakCategoryId": null,
  "soundNotificationsEnabled": true,
  "notificationVolume": 70,
  "darkModeEnabled": false,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Example Category Sites Document
```json
{
  "_id": "category_sites",
  "work-focus": {
    "sites": ["facebook.com", "twitter.com", "instagram.com"],
    "enabled": true
  },
  "study-mode": {
    "sites": ["reddit.com", "youtube.com", "tiktok.com"],
    "enabled": false
  },
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Example Analytics Document  
```json
{
  "_id": "analytics_data",
  "sessions": [
    {
      "id": "1705315800000-abc123",
      "start": "2024-01-15T10:30:00Z",
      "end": "2024-01-15T10:55:00Z", 
      "type": "pomodoro",
      "plannedSec": 1500,
      "actualSec": 1500,
      "completed": true
    }
  ],
  "byDay": {
    "2024-01-15": {
      "focusSeconds": 3600,
      "sessionsStarted": 3,
      "sessionsCompleted": 2,
      "sitesBlocked": 15
    }
  },
  "updatedAt": "2024-01-15T10:55:00Z"
}
```

## Performance and Scalability Considerations

### Data Size Limits
- **Chrome Storage Local**: 5MB per extension
- **Firestore Document**: 1MB per document  
- **Analytics Pruning**: Keeps last 1000 sessions, 180 days of daily data
- **Category Limits**: No enforced limit, practical limit ~100 categories

### Query Patterns
- **Real-time reads**: Chrome Storage Local (synchronous)
- **Background sync**: Firestore batch operations
- **Analytics queries**: Pre-aggregated daily summaries avoid expensive calculations
- **Category lookups**: In-memory category metadata for fast UI rendering

### Security Considerations
- **Local encryption**: Chrome automatically encrypts local storage
- **Firestore rules**: Users can only access their own documents under `users/{uid}/`
- **No sensitive data**: Only productivity preferences and anonymous usage metrics
- **Optional sync**: Users can disable cloud sync for privacy

---

This NoSQL schema design supports Bolt Blocker's hybrid storage architecture, providing both offline functionality and cloud synchronization while maintaining data consistency and performance.