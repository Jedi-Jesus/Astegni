

// Mock Data
const bookstore = {
      id: 'bookstore1',
      name: 'Knowledge Hub',
      coverPhoto: 'https://picsum.photos/seed/bookstore-cover/1200/400',
      profilePic: 'https://picsum.photos/seed/bookstore-profile/150/150',
      rating: '4.2 (128 reviews)',
      phone: '+1 (555) 123-4567',
      email: 'contact@knowledgehub.com',
      locations: [
        '123 Main St, New York, NY 10001',
        '456 Oak Ave, Los Angeles, CA 90001',
        '789 Pine Rd, Chicago, IL 60601'
      ],
      bio: 'Knowledge Hub is a premier bookstore offering a diverse collection of books and games, fostering a love for learning and entertainment.',
      quote: 'Books are the gateways to new worlds and endless possibilities.',
      socials: {
        facebook: 'https://facebook.com/knowledgehub',
        twitter: 'https://twitter.com/knowledgehub',
        instagram: 'https://instagram.com/knowledgehub'
      },
      videos: {
        intro: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Welcome to Knowledge Hub!' },
        shorts: [
          { url: 'https://www.youtube.com/embed/abc123', title: 'Quick Book Recommendation' },
          { url: 'https://www.youtube.com/embed/def456', title: 'Tour Our Store' }
        ],
        videos: [
          { url: 'https://www.youtube.com/embed/ghi789', title: 'Interview with Elara Stone' },
          { url: 'https://www.youtube.com/embed/jkl012', title: 'The Dragon’s Quest Launch' }
        ],
        playlists: [
          { title: 'Sci-Fi Favorites', videos: ['https://www.youtube.com/embed/vid7891', 'https://www.youtube.com/embed/vid7892'] },
          { title: 'Non-Fiction Insights', videos: ['https://www.youtube.com/embed/vid0121', 'https://www.youtube.com/embed/vid0122'] }
        ]
      }
    };

    const books = [
      { id: 'b1', title: 'The Dragon’s Quest', author: 'Elara Stone', authorId: 'author1', genre: 'Fiction', price: 19.99, image: 'https://picsum.photos/seed/fantasy1/200/300', description: 'A thrilling fantasy adventure following a young hero’s quest to slay a dragon.', rating: '4.5 (50 reviews)', publishedYear: 2023, ageRestriction: '13+', reviews: [{ user: 'Alice', rating: 5, comment: 'Epic story!', date: 'July 15, 2025' }, { user: 'Bob', rating: 4, comment: 'Loved the characters.', date: 'July 10, 2025' }] },
      { id: 'b2', title: 'Starship Chronicles', author: 'Jaxon Reed', authorId: 'author2', genre: 'Fiction', price: 24.99, image: 'https://picsum.photos/seed/scifi1/200/300', description: 'A sci-fi epic exploring interstellar wars and human survival.', rating: '4.7 (60 reviews)', publishedYear: 2024, ageRestriction: '16+', reviews: [{ user: 'Charlie', rating: 5, comment: 'Mind-blowing!', date: 'July 12, 2025' }] },
      { id: 'b3', title: 'The Hidden Clue', author: 'Mira Holt', authorId: 'author3', genre: 'Fiction', price: 22.99, image: 'https://picsum.photos/seed/mystery1/200/300', description: 'A gripping mystery unraveling a detective’s toughest case.', rating: '4.3 (40 reviews)', publishedYear: 2022, ageRestriction: '13+', reviews: [{ user: 'Diana', rating: 4, comment: 'Kept me guessing!', date: 'July 18, 2025' }] },
      { id: 'b10', title: 'Quantum Mechanics', author: 'John Doe', authorId: 'author10', genre: 'Non-Fiction', price: 29.99, image: 'https://picsum.photos/seed/quantum/200/300', description: 'An in-depth exploration of quantum theory for enthusiasts.', rating: '4.8 (30 reviews)', publishedYear: 2021, ageRestriction: '18+', reviews: [{ user: 'Eve', rating: 5, comment: 'Very informative.', date: 'July 20, 2025' }] },
      { id: 'b11', title: 'Ancient Civilizations', author: 'Laura King', authorId: 'author11', genre: 'Non-Fiction', price: 27.99, image: 'https://picsum.photos/seed/history1/200/300', description: 'A comprehensive guide to the world’s ancient cultures.', rating: '4.4 (25 reviews)', publishedYear: 2020, ageRestriction: 'All Ages', reviews: [{ user: 'Frank', rating: 4, comment: 'Fascinating read.', date: 'July 19, 2025' }] },
      { id: 'b12', title: 'Stargazing Guide', author: 'Mark Star', authorId: 'author12', genre: 'Non-Fiction', price: 26.99, image: 'https://picsum.photos/seed/astronomy1/200/300', description: 'A beginner’s guide to exploring the night sky.', rating: '4.6 (20 reviews)', publishedYear: 2023, ageRestriction: 'All Ages', reviews: [{ user: 'Sophie', rating: 5, comment: 'Perfect for beginners.', date: 'July 17, 2025' }] }
    ];

    const authors = [
      {
        id: 'author1',
        name: 'Elara Stone',
        coverPhoto: 'https://picsum.photos/seed/author1-cover/1200/300',
        profilePic: 'https://picsum.photos/seed/author1/100/100',
        about: 'Elara Stone is a renowned fantasy author known for her vivid world-building.',
        quote: 'Imagination is the key to unlocking epic adventures.',
        socials: { facebook: 'https://facebook.com/elara', twitter: 'https://twitter.com/elara', instagram: 'https://instagram.com/elara' },
        reviews: [{ user: 'Jane', rating: 5, comment: 'Her books are magical!', date: 'July 10, 2025' }],
        videos: {
          intro: { url: 'https://www.youtube.com/embed/xyz123', title: 'Elara Stone Introduction' },
          shorts: [{ url: 'https://www.youtube.com/embed/short1', title: 'Fantasy Writing Tips' }],
          videos: [{ url: 'https://www.youtube.com/embed/video1', title: 'World-Building Secrets' }],
          playlists: [
            { title: 'Fantasy Worlds', videos: ['https://www.youtube.com/embed/vid7891', 'https://www.youtube.com/embed/vid7892'] }
          ]
        }
      },
      {
        id: 'author2',
        name: 'Jaxon Reed',
        coverPhoto: 'https://picsum.photos/seed/author2-cover/1200/300',
        profilePic: 'https://picsum.photos/seed/author2/100/100',
        about: 'Jaxon Reed crafts thrilling sci-fi narratives with a focus on human resilience.',
        quote: 'The stars are just the beginning of our story.',
        socials: { facebook: 'https://facebook.com/jaxon', twitter: 'https://twitter.com/jaxon', instagram: 'https://instagram.com/jaxon' },
        reviews: [{ user: 'Mike', rating: 4, comment: 'Great sci-fi author.', date: 'July 12, 2025' }],
        videos: {
          intro: { url: 'https://www.youtube.com/embed/xyz456', title: 'Jaxon Reed Introduction' },
          shorts: [{ url: 'https://www.youtube.com/embed/short2', title: 'Sci-Fi Concepts' }],
          videos: [{ url: 'https://www.youtube.com/embed/video2', title: 'Interstellar Travel' }],
          playlists: [
            { title: 'Sci-Fi Epics', videos: ['https://www.youtube.com/embed/vid0121', 'https://www.youtube.com/embed/vid0122'] }
          ]
        }
      },
      {
        id: 'author3',
        name: 'Mira Holt',
        coverPhoto: 'https://picsum.photos/seed/author3-cover/1200/300',
        profilePic: 'https://picsum.photos/seed/author3/100/100',
        about: 'Mira Holt is a master of mystery, weaving intricate plots.',
        quote: 'Every clue leads to a new mystery.',
        socials: { facebook: 'https://facebook.com/mira', twitter: 'https://twitter.com/mira', instagram: 'https://instagram.com/mira' },
        reviews: [{ user: 'Lily', rating: 5, comment: 'Her mysteries are gripping.', date: 'July 15, 2025' }],
        videos: {
          intro: { url: 'https://www.youtube.com/embed/xyz789', title: 'Mira Holt Introduction' },
          shorts: [{ url: 'https://www.youtube.com/embed/short3', title: 'Mystery Writing' }],
          videos: [{ url: 'https://www.youtube.com/embed/video3', title: 'Crafting a Mystery' }],
          playlists: [
            { title: 'Mystery Tales', videos: ['https://www.youtube.com/embed/vid3451', 'https://www.youtube.com/embed/vid3452'] }
          ]
        }
      },
      {
        id: 'author10',
        name: 'John Doe',
        coverPhoto: 'https://picsum.photos/seed/author10-cover/1200/300',
        profilePic: 'https://picsum.photos/seed/author10/100/100',
        about: 'John Doe is an expert in quantum physics, making complex concepts accessible.',
        quote: 'The universe is a puzzle waiting to be solved.',
        socials: { facebook: 'https://facebook.com/john', twitter: 'https://twitter.com/john', instagram: 'https://instagram.com/john' },
        reviews: [{ user: 'Tom', rating: 5, comment: 'Clear and insightful.', date: 'July 20, 2025' }],
        videos: {
          intro: { url: 'https://www.youtube.com/embed/xyz101', title: 'John Doe Introduction' },
          shorts: [{ url: 'https://www.youtube.com/embed/short10', title: 'Quantum Basics' }],
          videos: [{ url: 'https://www.youtube.com/embed/video10', title: 'Quantum Theory Explained' }],
          playlists: [
            { title: 'Physics Insights', videos: ['https://www.youtube.com/embed/vid1011', 'https://www.youtube.com/embed/vid1012'] }
          ]
        }
      },
      {
        id: 'author11',
        name: 'Laura King',
        coverPhoto: 'https://picsum.photos/seed/author11-cover/1200/300',
        profilePic: 'https://picsum.photos/seed/author11/100/100',
        about: 'Laura King is a historian passionate about ancient civilizations.',
        quote: 'History is the story of who we are.',
        socials: { facebook: 'https://facebook.com/laura', twitter: 'https://twitter.com/laura', instagram: 'https://instagram.com/laura' },
        reviews: [{ user: 'Emma', rating: 4, comment: 'Engaging historical accounts.', date: 'July 19, 2025' }],
        videos: {
          intro: { url: 'https://www.youtube.com/embed/xyz111', title: 'Laura King Introduction' },
          shorts: [{ url: 'https://www.youtube.com/embed/short11', title: 'Ancient History Tips' }],
          videos: [{ url: 'https://www.youtube.com/embed/video11', title: 'Civilizations Uncovered' }],
          playlists: [
            { title: 'Historical Journeys', videos: ['https://www.youtube.com/embed/vid1111', 'https://www.youtube.com/embed/vid1112'] }
          ]
        }
      },
      {
        id: 'author12',
        name: 'Mark Star',
        coverPhoto: 'https://picsum.photos/seed/author12-cover/1200/300',
        profilePic: 'https://picsum.photos/seed/author12/100/100',
        about: 'Mark Star is an astronomer dedicated to making stargazing accessible.',
        quote: 'The stars are within everyone’s reach.',
        socials: { facebook: 'https://facebook.com/mark', twitter: 'https://twitter.com/mark', instagram: 'https://instagram.com/mark' },
        reviews: [{ user: 'Sophie', rating: 5, comment: 'Perfect for stargazers.', date: 'July 17, 2025' }],
        videos: {
          intro: { url: 'https://www.youtube.com/embed/xyz121', title: 'Mark Star Introduction' },
          shorts: [{ url: 'https://www.youtube.com/embed/short12', title: 'Stargazing Basics' }],
          videos: [{ url: 'https://www.youtube.com/embed/video12', title: 'Exploring the Night Sky' }],
          playlists: [
            { title: 'Astronomy Guides', videos: ['https://www.youtube.com/embed/vid1211', 'https://www.youtube.com/embed/vid1212'] }
          ]
        }
      }
    ];

    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    let followedBookstores = JSON.parse(localStorage.getItem('followedBookstores')) || [];
    let followedAuthors = JSON.parse(localStorage.getItem('followedAuthors')) || [];

    // Utility Functions
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    function sanitizeInput(input) {
      const div = document.createElement('div');
      div.textContent = input;
      return div.innerHTML;
    }

    function showNotification(message, type = 'success') {
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }

    // Modal Functions
    function openCommentsModal() {
      const commentsModal = document.getElementById('comments-modal');
      if (commentsModal) commentsModal.style.display = 'flex';
    }

    function closeCommentsModal() {
      const commentsModal = document.getElementById('comments-modal');
      if (commentsModal) commentsModal.style.display = 'none';
    }

    function openEditProfileModal() {
      const modal = document.getElementById('edit-profile-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeEditProfileModal() {
      const modal = document.getElementById('edit-profile-modal');
      if (modal) modal.style.display = 'none';
    }

    function openUploadBookModal() {
      const modal = document.getElementById('upload-book-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeUploadBookModal() {
      const modal = document.getElementById('upload-book-modal');
      if (modal) modal.style.display = 'none';
    }

    function openUploadVideoModal() {
      const modal = document.getElementById('upload-video-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeUploadVideoModal() {
      const modal = document.getElementById('upload-video-modal');
      if (modal) modal.style.display = 'none';
    }

    function openBookDetailModal(bookId) {
      const book = books.find(b => b.id === bookId);
      if (!book) return;
      const modal = document.getElementById('book-detail-modal');
      const title = document.getElementById('book-detail-title');
      const cover = document.getElementById('book-detail-cover');
      const author = document.getElementById('book-detail-author');
      const description = document.getElementById('book-detail-description');
      const rating = document.getElementById('book-detail-rating');
      const price = document.getElementById('book-detail-price');
      const reviewsBtn = document.getElementById('book-detail-reviews-btn');
      const wishlistBtn = document.getElementById('book-detail-wishlist');
      const buyBtn = document.getElementById('book-detail-buy');
      if (!modal || !title || !cover || !author || !description || !rating || !price || !reviewsBtn || !wishlistBtn || !buyBtn) return;

      title.textContent = sanitizeInput(book.title);
      cover.src = book.image;
      cover.alt = `${sanitizeInput(book.title)} cover`;
      author.innerHTML = `Author: <a href="#" onclick="openAuthorDetailModal('${book.authorId}', '${book.id}')" class="text-blue-600 hover:underline" aria-label="View ${sanitizeInput(book.author)}'s profile">${sanitizeInput(book.author)}</a>`;
      description.textContent = `Description: ${sanitizeInput(book.description)}`;
      rating.textContent = `Rating: ${sanitizeInput(book.rating)}`;
      price.textContent = `Price: $${book.price.toFixed(2)}`;
      reviewsBtn.onclick = () => openReviewsModal('book', bookId);
      wishlistBtn.onclick = () => addToWishlist(bookId);
      buyBtn.onclick = () => buyBook(bookId);
      modal.style.display = 'flex';
    }

    function closeBookDetailModal() {
      const modal = document.getElementById('book-detail-modal');
      if (modal) modal.style.display = 'none';
    }

    function openAuthorDetailModal(authorId, bookId) {
      const author = authors.find(a => a.id === authorId);
      const book = books.find(b => b.id === bookId);
      if (!author) return;
      const modal = document.getElementById('author-detail-modal');
      const coverPhoto = document.getElementById('author-cover-photo');
      const profilePic = document.getElementById('author-profile-pic');
      const name = document.getElementById('author-name');
      const about = document.getElementById('author-about');
      const quote = document.getElementById('author-quote');
      const socials = document.getElementById('author-socials');
      const reviewsBtn = document.getElementById('author-reviews-btn');
      const followBtn = document.getElementById('follow-author-btn');
      const currentBook = document.getElementById('author-current-book');
      const booksDiv = document.getElementById('author-books');
      const introVideo = document.getElementById('author-intro-video');
      const introTitle = document.getElementById('author-intro-title');
      const shortsTab = document.getElementById('author-shorts-tab');
      const videosTab = document.getElementById('author-videos-tab');
      const playlistsTab = document.getElementById('author-playlists-tab');
      if (!modal || !coverPhoto || !profilePic || !name || !about || !quote || !socials || !reviewsBtn || !followBtn || !currentBook || !booksDiv || !introVideo || !introTitle || !shortsTab || !videosTab || !playlistsTab) return;

      coverPhoto.src = author.coverPhoto;
      coverPhoto.alt = `${sanitizeInput(author.name)} cover photo`;
      profilePic.src = author.profilePic;
      profilePic.alt = `${sanitizeInput(author.name)} profile picture`;
      name.textContent = sanitizeInput(author.name);
      about.textContent = `About: ${sanitizeInput(author.about)}`;
      quote.textContent = `Quote: ${sanitizeInput(author.quote)}`;
      socials.innerHTML = Object.entries(author.socials).map(([key, url]) => `
        <a href="${url}" target="_blank" class="text-blue-600 hover:underline" aria-label="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</a>
      `).join('');
      reviewsBtn.onclick = () => openReviewsModal('author', authorId);
      followBtn.textContent = followedAuthors.includes(authorId) ? 'Unfollow' : 'Follow';
      followBtn.onclick = () => toggleFollowAuthor(authorId);
      currentBook.innerHTML = book ? `
        <img src="${book.image}" alt="${sanitizeInput(book.title)} cover" class="w-full h-48 object-cover rounded">
        <h4 class="text-lg font-semibold mt-2">${sanitizeInput(book.title)}</h4>
        <p class="text-gray-600">$${book.price.toFixed(2)}</p>
        <button onclick="openBookDetailModal('${book.id}')" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" aria-label="View details of ${sanitizeInput(book.title)}">View Details</button>
      ` : '';
      booksDiv.innerHTML = books.filter(b => b.authorId === authorId && b.id !== bookId).map(book => `
        <div class="book-card bg-white p-4 rounded-lg shadow">
          <img src="${book.image}" alt="${sanitizeInput(book.title)} cover" class="w-full h-48 object-cover rounded">
          <h4 class="text-lg font-semibold mt-2">${sanitizeInput(book.title)}</h4>
          <p class="text-gray-600">$${book.price.toFixed(2)}</p>
          <button onclick="openBookDetailModal('${book.id}')" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" aria-label="View details of ${sanitizeInput(book.title)}">View Details</button>
        </div>
      `).join('');
      introVideo.src = author.videos.intro.url;
      introVideo.title = sanitizeInput(author.videos.intro.title);
      introTitle.textContent = sanitizeInput(author.videos.intro.title);
      shortsTab.innerHTML = author.videos.shorts.map(v => `
        <div class="video-card bg-white p-4 rounded-lg shadow">
          <iframe class="w-full h-48" src="${v.url}" title="${sanitizeInput(v.title)}" frameborder="0" allowfullscreen></iframe>
          <p class="mt-2 text-gray-600">${sanitizeInput(v.title)}</p>
        </div>
      `).join('');
      videosTab.innerHTML = author.videos.videos.map(v => `
        <div class="video-card bg-white p-4 rounded-lg shadow">
          <iframe class="w-full h-48" src="${v.url}" title="${sanitizeInput(v.title)}" frameborder="0" allowfullscreen></iframe>
          <p class="mt-2 text-gray-600">${sanitizeInput(v.title)}</p>
        </div>
      `).join('');
      playlistsTab.innerHTML = author.videos.playlists.map(p => `
        <div class="video-card bg-white p-4 rounded-lg shadow">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">${sanitizeInput(p.title)}</h3>
          <iframe class="w-full h-48" src="${p.videos[0]}" title="${sanitizeInput(p.title)}" frameborder="0" allowfullscreen onclick="openPlaylistModal('${sanitizeInput(p.title)}', ${JSON.stringify(p.videos)})"></iframe>
          <div class="mt-2 space-y-2">
            ${p.videos.map((v, i) => `
              <p class="text-gray-600 cursor-pointer" onclick="openPlaylistModal('${sanitizeInput(p.title)}', ${JSON.stringify(p.videos)}, '${v}')">Video ${i + 1}</p>
            `).join('')}
          </div>
        </div>
      `).join('');
      modal.style.display = 'flex';
    }

    function closeAuthorDetailModal() {
      const modal = document.getElementById('author-detail-modal');
      if (modal) modal.style.display = 'none';
    }

    function openReviewsModal(type, id) {
      const modal = document.getElementById('reviews-modal');
      const title = document.getElementById('reviews-modal-title');
      const reviewsList = document.getElementById('reviews-list');
      if (!modal || !title || !reviewsList) return;

      let reviews = [];
      if (type === 'book') {
        const book = books.find(b => b.id === id);
        if (book) {
          title.textContent = `Reviews for ${sanitizeInput(book.title)}`;
          reviews = book.reviews || [];
        }
      } else if (type === 'author') {
        const author = authors.find(a => a.id === id);
        if (author) {
          title.textContent = `Reviews for ${sanitizeInput(author.name)}`;
          reviews = author.reviews || [];
        }
      }
      reviewsList.innerHTML = reviews.map(r => `
        <div class="mb-4">
          <p class="text-gray-600"><strong>${sanitizeInput(r.user)}</strong> - ${r.rating}/5</p>
          <p class="text-gray-600">${sanitizeInput(r.comment)}</p>
          <p class="text-sm text-gray-500">Posted on ${sanitizeInput(r.date)}</p>
        </div>
      `).join('') || '<p class="text-gray-600">No reviews available.</p>';
      modal.style.display = 'flex';
    }

    function closeReviewsModal() {
      const modal = document.getElementById('reviews-modal');
      if (modal) modal.style.display = 'none';
    }

    function openPlaylistModal(title, videos, selectedVideo = videos[0]) {
      const modal = document.getElementById('playlist-video-modal');
      const playlistTitle = document.getElementById('playlist-title');
      const mainVideo = document.getElementById('playlist-main-video');
      const videoList = document.getElementById('playlist-video-list');
      if (!modal || !playlistTitle || !mainVideo || !videoList) return;

      playlistTitle.textContent = sanitizeInput(title);
      mainVideo.src = selectedVideo;
      mainVideo.title = sanitizeInput(title);
      videoList.innerHTML = videos.map((v, i) => `
        <p class="text-gray-600 cursor-pointer ${v === selectedVideo ? 'font-bold' : ''}" onclick="openPlaylistModal('${sanitizeInput(title)}', ${JSON.stringify(videos)}, '${v}')">Video ${i + 1}</p>
      `).join('');
      modal.style.display = 'flex';
    }

    function closePlaylistModal() {
      const modal = document.getElementById('playlist-video-modal');
      if (modal) modal.style.display = 'none';
    }

    // Tab Switching
    function switchContentTab(tabId, element, context) {
      const tabs = document.querySelectorAll(`#${context === 'content' ? '' : context + '-'}${tabId.split('-')[0]}-tab .tab`);
      const contents = document.querySelectorAll(`#${context === 'content' ? '' : context + '-'}${tabId.split('-')[0]}-tab .tab-content`);
      
      tabs.forEach(tab => tab.classList.remove('active'));
      contents.forEach(content => content.classList.remove('active'));

      element.classList.add('active');
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');

      // For top-level content tabs (Books/Videos)
      if (context === 'content') {
        const allContentTabs = document.querySelectorAll('.tab-content[id$="-tab"]');
        allContentTabs.forEach(tab => {
          if (tab.id !== tabId) tab.classList.remove('active');
        });

        // Clear active state from all top-level tabs
        const contentTabs = document.querySelectorAll('.tab');
        contentTabs.forEach(tab => tab.classList.remove('active'));
        element.classList.add('active');

        // If Videos tab is clicked, default to Shorts
        if (tabId === 'videos-tab') {
          const shortsTab = document.querySelector('#videos-tab .tab[onclick*="video-shorts-tab"]');
          const shortsContent = document.getElementById('video-shorts-tab');
          if (shortsTab && shortsContent) {
            switchContentTab('video-shorts-tab', shortsTab, 'video');
          }
        }
      }
      
      // For video sub-tabs (Shorts/Videos/Playlists)
      if (context === 'video') {
        const videoTabs = document.querySelectorAll('#videos-tab .tab');
        const videoContents = document.querySelectorAll('#videos-tab .tab-content');
        videoTabs.forEach(tab => tab.classList.remove('active'));
        videoContents.forEach(content => content.classList.remove('active'));
        element.classList.add('active');
        if (targetContent) targetContent.classList.add('active');
      }
    }

    // Action Functions
    function followBookstore() {
      if (followedBookstores.includes(bookstore.id)) {
        followedBookstores = followedBookstores.filter(id => id !== bookstore.id);
        showNotification('Unfollowed Bookstore');
      } else {
        followedBookstores.push(bookstore.id);
        showNotification('Followed Bookstore');
      }
      localStorage.setItem('followedBookstores', JSON.stringify(followedBookstores));
      const followBtn = document.getElementById('follow-bookstore-btn');
      if (followBtn) followBtn.textContent = followedBookstores.includes(bookstore.id) ? 'Unfollow' : 'Follow';
    }

    function toggleFollowAuthor(authorId) {
      if (followedAuthors.includes(authorId)) {
        followedAuthors = followedAuthors.filter(id => id !== authorId);
        showNotification('Unfollowed author');
      } else {
        followedAuthors.push(authorId);
        showNotification('Followed author');
      }
      localStorage.setItem('followedAuthors', JSON.stringify(followedAuthors));
      const followBtn = document.getElementById('follow-author-btn');
      if (followBtn) followBtn.textContent = followedAuthors.includes(authorId) ? 'Unfollow' : 'Follow';
    }

    function toggleFavorite(bookId) {
      const icon = document.querySelector(`.favorite-icon[data-book-id="${bookId}"]`);
      if (!icon) return;
      if (wishlist.includes(bookId)) {
        wishlist = wishlist.filter(id => id !== bookId);
        icon.classList.remove('filled');
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>`;
        showNotification('Removed from favorites');
      } else {
        wishlist.push(bookId);
        icon.classList.add('filled');
        icon.innerHTML = `<path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L12 8.343l3.172-3.171a4 4 0 115.656 5.656L12 18.343l-8.828-8.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>`;
        showNotification('Added to favorites');
      }
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }

    function addToWishlist(bookId) {
      if (!wishlist.includes(bookId)) {
        wishlist.push(bookId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        showNotification('Added to wishlist');
      } else {
        showNotification('Already in wishlist', 'error');
      }
    }

    function buyBook(bookId) {
      const book = books.find(b => b.id === bookId);
      if (book) {
        showNotification(`Purchased ${sanitizeInput(book.title)} for $${book.price.toFixed(2)}`);
      }
    }

    function filterByGenre(genre) {
      const fictionRow = document.querySelector('.genre-row:nth-child(1) .grid');
      const nonFictionRow = document.querySelector('.genre-row:nth-child(2) .grid');
      if (!fictionRow || !nonFictionRow) return;

      if (genre === 'Fiction') {
        fictionRow.innerHTML = books.filter(b => b.genre === 'Fiction').map(book => `
          <div class="book-card bg-white p-4 rounded-lg shadow">
            <img src="${book.image}" alt="${sanitizeInput(book.title)} cover" class="w-full h-48 object-cover rounded">
            <h4 class="text-lg font-semibold mt-2">${sanitizeInput(book.title)}</h4>
            <p class="text-gray-600"><a href="#" onclick="openAuthorDetailModal('${book.authorId}', '${book.id}')" class="text-blue-600 hover:underline" aria-label="View ${sanitizeInput(book.author)}'s profile">${sanitizeInput(book.author)}</a></p>
            <p class="text-gray-600">$${book.price.toFixed(2)}</p>
            <div class="flex gap-2 mt-2">
              <button onclick="openBookDetailModal('${book.id}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" aria-label="View details of ${sanitizeInput(book.title)}">View Details</button>
              <button onclick="buyBook('${book.id}')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-blue-700" aria-label="Buy ${sanitize.title}">Buy</button>
              <svg class="w-6 h-6 favorite-icon ${wishlist.includes(book.id) ? 'filled' : ''}" data-book-id="${book.id}" onclick="toggleFavorite('${book.id}')" fill="${wishlist.includes(book.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" aria-label="Add ${sanitizeInput(book.title)} to favorites">
                ${wishlist.includes(book.id) ? 
                  `<path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L12 8.343l3.172-3.171a4 4 0 115.656 5.656L12 18.343l-8.828-8.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>` :
                  `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>`
                }
              </svg>
            </div>
          </div>
        `).join('');
        nonFictionRow.innerHTML = '';
      } else if (genre === 'Non-Fiction') {
        nonFictionRow.innerHTML = books.filter(b => b.genre === 'Non-Fiction').map(book => `
          <div class="book-card bg-white p-4 rounded-lg shadow">
            <img src="${book.image}" alt="${sanitizeInput(book.title)} cover" class="w-full h-48 object-cover rounded">
            <h4 class="text-lg font-semibold mt-2">${sanitizeInput(book.title)}</h4>
            <p class="text-gray-600"><a href="#" onclick="openAuthorDetailModal('${book.authorId}', '${book.id}')" class="text-blue-600 hover:underline" aria-label="View ${sanitizeInput(book.author)}'s profile">${sanitizeInput(book.author)}</a></p>
            <p class="text-gray-600">$${book.price.toFixed(2)}</p>
            <div class="flex gap-2 mt-2">
              <button onclick="openBookDetailModal('${book.id}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" aria-label="View details of ${sanitizeInput(book.title)}">View Details</button>
              <button onclick="buyBook('${book.id}')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-blue-green" aria-label="Buy ${sanitize.title}">Buy</button>
              <svg class="w-6 h-6 favorite-icon ${wishlist.includes(book.id) ? 'filled' : ''}" data-book-id="${book.id}" onclick="toggleFavorite('${book.id}')" fill="${wishlist.includes(book.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" aria-label="Add ${sanitizeInput(book.title)} to favorites">
                ${wishlist.includes(book.id) ? 
                  `<path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L12 8.343l3.172-3.171a4 4 0 115.656 5.656L12 18.343l-8.828-8.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>` :
                  `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>`
                }
              </svg>
            </div>
          </div>
        `).join('');
        fictionRow.innerHTML = '';
      }
    }

    function saveProfile() {
      const name = document.getElementById('edit-name').value;
      const phone = document.getElementById('edit-phone').value;
      const email = document.getElementById('edit-email').value;
      const locations = Array.from(document.querySelectorAll('#edit-locations input')).map(input => input.value).filter(v => v.trim());
      const bio = document.getElementById('edit-bio').value;
      const quote = document.getElementById('edit-quote').value;
      const facebook = document.getElementById('edit-facebook').value;
      const twitter = document.getElementById('edit-twitter').value;
      const instagram = document.getElementById('edit-instagram').value;

      document.getElementById('bookstore-name').textContent = sanitizeInput(name);
      document.getElementById('bookstore-phone').innerHTML = `<strong>Phone:</strong> ${sanitizeInput(phone)}`;
      document.getElementById('bookstore-email').innerHTML = `<strong>Email:</strong> ${sanitizeInput(email)}`;
      document.getElementById('bookstore-locations').innerHTML = locations.map(loc => `<li>${sanitizeInput(loc)}</li>`).join('');
      document.getElementById('bookstore-bio').innerHTML = `<strong>Bio:</strong> ${sanitizeInput(bio)}`;
      document.getElementById('bookstore-quote').innerHTML = `<strong>Quote:</strong> ${sanitizeInput(quote)}`;
      document.getElementById('bookstore-socials').innerHTML = `
        <strong>Socials:</strong>
        ${facebook ? `<a href="${facebook}" target="_blank" class="text-blue-600 hover:underline" aria-label="Facebook">Facebook</a>` : ''}
        ${twitter ? `<a href="${twitter}" target="_blank" class="text-blue-600 hover:underline" aria-label="Twitter">Twitter</a>` : ''}
        ${instagram ? `<a href="${instagram}" target="_blank" class="text-blue-600 hover:underline" aria-label="Instagram">Instagram</a>` : ''}
      `;

      showNotification('Profile updated successfully');
      closeEditProfileModal();
    }

    function saveBook() {
      const cover = document.getElementById('book-cover').value;
      const title = document.getElementById('book-title').value;
      const author = document.getElementById('book-author').value;
      const description = document.getElementById('book-description').value;
      const year = document.getElementById('book-year').value;
      const age = document.getElementById('book-age').value;
      const price = document.getElementById('book-price').value;

      if (!cover || !title || !author || !description || !year || !age || !price) {
        showNotification('Please fill in all fields', 'error');
        return;
      }

      const newBook = {
        id: generateUUID(),
        title,
        author,
        authorId: `author-${Math.random().toString(36).substr(2, 9)}`,
        genre: 'Fiction',
        price: parseFloat(price),
        image: cover,
        description,
        rating: '0.0 (0 reviews)',
        publishedYear: parseInt(year),
        ageRestriction: age,
        reviews: []
      };

      books.push(newBook);
      showNotification('Book uploaded successfully');
      closeUploadBookModal();
    }

    function saveVideo() {
      const videoUrl = document.getElementById('video-url').value;
      const videoType = document.getElementById('video-type').value;
      const addToPlaylist = document.getElementById('add-to-playlist').checked;
      const createNewPlaylist = document.getElementById('create-new-playlist').checked;
      const newPlaylistTitle = document.getElementById('new-playlist-title').value;
      const existingPlaylist = document.getElementById('existing-playlist').value;

      if (!videoUrl || !videoType) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      if (addToPlaylist && createNewPlaylist && newPlaylistTitle) {
        bookstore.videos.playlists.push({
          title: newPlaylistTitle,
          videos: [videoUrl]
        });
      } else if (addToPlaylist && existingPlaylist) {
        const playlist = bookstore.videos.playlists.find(p => p.title === existingPlaylist);
        if (playlist) {
          playlist.videos.push(videoUrl);
        }
      } else {
        bookstore.videos[videoType.toLowerCase()].push({
          url: videoUrl,
          title: `New ${videoType} Video`
        });
      }

      showNotification('Video uploaded successfully');
      closeUploadVideoModal();
    }

    // Event Listeners
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('hidden');
    });

    document.getElementById('follow-bookstore-btn')?.addEventListener('click', followBookstore);
    document.getElementById('view-comments-btn')?.addEventListener('click', openCommentsModal);
    document.getElementById('close-comments-btn')?.addEventListener('click', closeCommentsModal);
    document.getElementById('edit-profile-btn')?.addEventListener('click', openEditProfileModal);
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
    document.getElementById('cancel-edit-profile-btn')?.addEventListener('click', closeEditProfileModal);
    document.getElementById('upload-book-btn')?.addEventListener('click', openUploadBookModal);
    document.getElementById('save-book-btn')?.addEventListener('click', saveBook);
    document.getElementById('cancel-upload-book-btn')?.addEventListener('click', closeUploadBookModal);
    document.getElementById('upload-video-btn')?.addEventListener('click', openUploadVideoModal);
    document.getElementById('save-video-btn')?.addEventListener('click', saveVideo);
    document.getElementById('cancel-upload-video-btn')?.addEventListener('click', closeUploadVideoModal);
    document.getElementById('close-book-detail-btn')?.addEventListener('click', closeBookDetailModal);
    document.getElementById('close-author-detail-btn')?.addEventListener('click', closeAuthorDetailModal);
    document.getElementById('close-reviews-btn')?.addEventListener('click', closeReviewsModal);
    document.getElementById('close-playlist-video-btn')?.addEventListener('click', closePlaylistModal);
    document.getElementById('add-location-btn')?.addEventListener('click', () => {
      const locationsDiv = document.getElementById('edit-locations');
      if (locationsDiv) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'w-full p-2 border rounded mt-2';
        input.placeholder = 'Enter new location';
        locationsDiv.appendChild(input);
      }
    });

    document.getElementById('add-to-playlist')?.addEventListener('change', (e) => {
      const playlistOptions = document.getElementById('playlist-options');
      if (playlistOptions) playlistOptions.classList.toggle('hidden', !e.target.checked);
    });

    document.getElementById('create-new-playlist')?.addEventListener('change', (e) => {
      const newPlaylistTitle = document.getElementById('new-playlist-title');
      const existingPlaylist = document.getElementById('existing-playlist');
      if (!newPlaylistTitle || !existingPlaylist) return;
      newPlaylistTitle.classList.toggle('hidden', !e.target.checked);
      existingPlaylist.disabled = e.target.checked;
    });

    // Initialize Favorites
    document.querySelectorAll('.favorite-icon').forEach(icon => {
      const bookId = icon.getAttribute('data-id');
      if (wishlist.includes(bookId)) {
        icon.classList.add('favorite');
        icon.innerHTML = `<path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L12 8.343l3.172-3.171a4 4 0 115.656 5.656L12 18.343l-8.828-8.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>`;
      }
    });

// Initialize Follow Button
    const followBtn = document.getElementById('follow-bookstore-btn');
    if (followBtn) followBtn.textContent = followedBookstores.includes(bookstore.id) ? 'Unfollow' : 'Follow';

    // Initialize Videos Tab Content
    function initializeVideosTab() {
      const videosTab = document.getElementById('videos-tab');
      if (!videosTab) return;

      // Default to Shorts tab when Videos is clicked
      const shortsTab = document.querySelector('#videos-tab .tab[onclick*="video-shorts-tab"]');
      const shortsContent = document.getElementById('video-shorts-tab');
      if (shortsTab && shortsContent) {
        switchContentTab('video-shorts-tab', shortsTab, 'video');
      }
    }

    // Call initialization
    initializeVideosTab();

  