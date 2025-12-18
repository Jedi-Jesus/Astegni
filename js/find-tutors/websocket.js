// ============================================
    // WEBSOCKET (OPTIONAL)
    // ============================================

    function initWebSocket() {
        if (!window.WebSocket) {
            console.log('WebSocket not supported');
            return;
        }

        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.API_BASE_URL ? new URL(window.API_BASE_URL).host : 'localhost:8000';
            const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/tutors/client_` + Date.now());

            ws.onopen = () => {
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'tutor_update') {
                        showNotification('New tutors available! Refreshing...', 'info');
                        fetchTutors(currentPage);
                    }
                } catch (e) {
                    console.error('WebSocket message parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.log('WebSocket connection failed - continuing without real-time updates');
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                // Only reconnect after 30 seconds to avoid spamming
                setTimeout(initWebSocket, 30000);
            };
        } catch (error) {
            console.log('WebSocket initialization skipped:', error.message);
        }
    }
