"""
Chat Polls Stub Endpoints

These are placeholder endpoints for the polls feature which is not yet implemented.
They return empty results to prevent 422 errors in the frontend.

When ready to implement polls, create a full polls system with proper database tables.
"""

# Add these to the end of chat_endpoints.py:

POLLS_STUBS = '''
# ============================================================================
# POLLS ENDPOINTS (Stubs - Not Yet Implemented)
# ============================================================================

@router.get("/polls/conversation/{conversation_id}")
async def get_conversation_polls(
    conversation_id: int,
    user_id: int = Query(...),
    current_user=Depends(get_current_user)
):
    """Get all polls in a conversation (stub - returns empty list)"""
    return {"polls": []}


@router.post("/polls")
async def create_poll(
    user_id: int = Query(...),
    conversation_id: int = Body(...),
    question: str = Body(...),
    options: List[str] = Body(...),
    current_user=Depends(get_current_user)
):
    """Create a new poll (stub - not implemented)"""
    raise HTTPException(
        status_code=501,
        detail="Polls feature is not yet implemented"
    )


@router.post("/polls/{poll_id}/vote")
async def vote_on_poll(
    poll_id: int,
    user_id: int = Query(...),
    option_index: int = Body(...),
    current_user=Depends(get_current_user)
):
    """Vote on a poll (stub - not implemented)"""
    raise HTTPException(
        status_code=501,
        detail="Polls feature is not yet implemented"
    )


@router.delete("/polls/{poll_id}")
async def delete_poll(
    poll_id: int,
    user_id: int = Query(...),
    current_user=Depends(get_current_user)
):
    """Delete a poll (stub - not implemented)"""
    raise HTTPException(
        status_code=501,
        detail="Polls feature is not yet implemented"
    )
'''

print("Copy the POLLS_STUBS content above and add to chat_endpoints.py before the final line")
