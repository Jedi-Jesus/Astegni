# Whiteboard Table - lab_id Field Addition

## Summary

Successfully added the `lab_id` field to the `whiteboard` table to enable integration with the **Digital Lab** feature.

## What Was Done

### 1. Migration Script Created
**File:** `astegni-backend/migrate_add_lab_id_to_whiteboard.py`

- Adds `lab_id` INTEGER column to whiteboard table
- Creates performance index on `lab_id`
- Checks if column already exists to prevent duplicate migration
- Safe to run multiple times

### 2. Seed Data Updated
**File:** `astegni-backend/seed_whiteboard_data.py`

Updated to include `lab_id` values:
- 7 sessions with Digital Lab integration (lab_id: 401-407)
- 3 sessions without Digital Lab (lab_id: NULL)

### 3. Documentation Updated
Updated both summary and verification documents to reflect the new field.

## Field Details

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `lab_id` | INTEGER | Reference to Digital Lab sessions | NULL |

**Purpose:** Links whiteboard sessions to Digital Lab experiments for integrated learning experiences.

**Index:** `idx_whiteboard_lab_id` for query performance.

## Sample Data Verification

```
ID    Session    Lab ID     Status          Recording    Has Lab
------------------------------------------------------------------------------------------
11    1          401        completed       Yes          Yes
12    2          402        in_progress     Yes          Yes
13    3          NULL       scheduled       No           No
14    4          403        completed       No           Yes
15    5          NULL       scheduled       No           No
16    6          404        completed       Yes          Yes
17    7          405        in_progress     No           Yes
18    8          NULL       scheduled       No           No
19    9          406        completed       Yes          Yes
20    10         407        in_progress     Yes          Yes
```

**Statistics:**
- Total sessions: 10
- Sessions with Digital Lab: 7 (70%)
- Sessions without Digital Lab: 3 (30%)

## Usage Examples

### Query sessions with Digital Lab
```sql
SELECT * FROM whiteboard WHERE lab_id IS NOT NULL;
```

### Query sessions without Digital Lab
```sql
SELECT * FROM whiteboard WHERE lab_id IS NULL;
```

### Get whiteboard with lab details (join example)
```sql
SELECT w.*, l.experiment_name
FROM whiteboard w
LEFT JOIN digital_labs l ON w.lab_id = l.id
WHERE w.status = 'in_progress';
```

### Update lab_id for a session
```sql
UPDATE whiteboard
SET lab_id = 408
WHERE id = 13;
```

## Migration History

1. ✅ `migrate_create_whiteboard_table.py` - Created base table
2. ✅ `migrate_add_lab_id_to_whiteboard.py` - Added lab_id field
3. ✅ `seed_whiteboard_data.py` - Seeded with lab data

## Integration Notes

### Backend Integration
When a whiteboard session has a `lab_id`:
- Load the associated Digital Lab experiment
- Enable lab-specific tools and equipment
- Sync whiteboard drawings with lab annotations
- Allow students to interact with virtual lab equipment

### Frontend Integration
```javascript
// Check if session has Digital Lab
if (whiteboardSession.lab_id) {
    // Load Digital Lab module
    loadDigitalLab(whiteboardSession.lab_id);

    // Show lab-specific UI
    showLabTools();
    showLabEquipment();

    // Enable lab interactions
    enableLabInteractions(whiteboardSession.student_permission);
}
```

### API Endpoint Examples
```python
# Get whiteboard with lab
@app.get("/api/whiteboard/{id}")
def get_whiteboard(id: int):
    whiteboard = db.query(Whiteboard).filter(Whiteboard.id == id).first()

    response = {
        "id": whiteboard.id,
        "session_id": whiteboard.session_id,
        "lab_id": whiteboard.lab_id,
        "status": whiteboard.status,
        # ... other fields
    }

    # Include lab details if lab_id exists
    if whiteboard.lab_id:
        lab = db.query(DigitalLab).filter(DigitalLab.id == whiteboard.lab_id).first()
        response["lab_details"] = {
            "id": lab.id,
            "name": lab.name,
            "experiment_type": lab.experiment_type,
            # ... other lab fields
        }

    return response
```

## Complete Whiteboard Schema (Updated)

| Field | Type | Description | Index |
|-------|------|-------------|-------|
| id | SERIAL PRIMARY KEY | Unique identifier | ✓ |
| session_id | INTEGER | Reference to sessions | ✓ |
| actual_start | TIMESTAMP | Actual start time | - |
| actual_end | TIMESTAMP | Actual end time | - |
| coursework_id | INTEGER | Reference to coursework | ✓ |
| canvas_id | INTEGER | Reference to canvas data | ✓ |
| notes_id | INTEGER | Reference to notes | ✓ |
| **lab_id** | **INTEGER** | **Reference to Digital Lab** | **✓** |
| student_permission | JSONB | Student permissions | - |
| is_recording | BOOLEAN | Recording flag | - |
| recording_id | INTEGER | Reference to recordings | ✓ |
| status | VARCHAR(50) | Session status | ✓ |
| created_at | TIMESTAMP | Creation timestamp | ✓ |
| updated_at | TIMESTAMP | Update timestamp | - |

## Next Steps

1. ✅ lab_id field added
2. ✅ Index created for performance
3. ✅ Sample data seeded
4. ⏳ Create Digital Lab table structure
5. ⏳ Add foreign key constraint to labs table
6. ⏳ Update API endpoints to handle lab_id
7. ⏳ Implement frontend Digital Lab integration
8. ⏳ Build lab-whiteboard sync functionality

## Status

✅ **COMPLETE** - The `lab_id` field has been successfully added to the whiteboard table and is ready for Digital Lab integration.
