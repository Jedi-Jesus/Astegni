// Institute Profile Connection Handler
window.InstituteConnect = {
    // Institute/Center information
    instituteInfo: {
        id: 'institute-1',
        name: 'Zenith Academy',
        avatar: '../pictures/tutor image 14.jpeg',
        occupation: 'Premier Education Platform',
        type: 'institute',
        status: 'online',
        email: 'contact@zenithacademy.edu',
        phone: '+1-555-987-6543',
        location: 'Bole, Addis Ababa, Ethiopia',
        about: 'Zenith Academy is a premier online education platform specializing in film production, digital media, and creative arts.',
        verified: true,
        rating: 4.9,
        reviews: 2847
    },

    // Open chat with institute
    openChat: function() {
        // Encode institute data to pass via URL
        const params = new URLSearchParams({
            userId: this.instituteInfo.id,
            name: this.instituteInfo.name,
            avatar: this.instituteInfo.avatar,
            occupation: this.instituteInfo.occupation,
            type: this.instituteInfo.type,
            email: this.instituteInfo.email,
            phone: this.instituteInfo.phone,
            verified: this.instituteInfo.verified
        });

        // Open chat.html with parameters
        window.location.href = `../branch/Chat.html?${params.toString()}`;
    },

    // Alternative: Open in new window
    openChatInNewWindow: function() {
        const params = new URLSearchParams({
            userId: this.instituteInfo.id,
            name: this.instituteInfo.name,
            avatar: this.instituteInfo.avatar,
            occupation: this.instituteInfo.occupation,
            type: this.instituteInfo.type,
            email: this.instituteInfo.email,
            phone: this.instituteInfo.phone,
            verified: this.instituteInfo.verified
        });

        const chatWindow = window.open(
            `../branch/Chat.html?${params.toString()}`,
            'InstituteChat',
            'width=1200,height=800,resizable=yes,scrollbars=yes'
        );
    }
};