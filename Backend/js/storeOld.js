
    // Mock Data
    const books = [
      { id: 'b1', title: "The Dragon's Quest", author: 'Elara Stone', authorId: 'author1', genre: 'fiction', subGenre: 'fantasy', bookstore: 'Knowledge Hub', price: 19.99, rating: 4.58, raters: 123, cover: 'https://picsum.photos/seed/fantasy1/200/300', description: 'An epic journey through a mythical land.' },
      { id: 'b2', title: 'Sword of Destiny', author: 'Elara Stone', authorId: 'author1', genre: 'fiction', subGenre: 'fantasy', bookstore: 'Knowledge Hub', price: 22.50, rating: 4.77, raters: 89, cover: 'https://picsum.photos/seed/fantasy2/200/300', description: 'A tale of courage and fate, centered on a legendary sword.' },
      { id: 'b3', title: 'The Enchanted Realm', author: 'Mira Vale', authorId: 'author2', genre: 'fiction', subGenre: 'fantasy', bookstore: 'Magic Reads', price: 18.99, rating: 4.6, raters: 156, cover: 'https://picsum.photos/seed/fantasy3/200/300', description: 'A magical world filled with wonder and danger.' },
      { id: 'b4', title: 'Crown of Shadows', author: 'Mira Vale', authorId: 'author2', genre: 'fiction', subGenre: 'fantasy', bookstore: 'Magic Reads', price: 20.99, rating: 4.88, raters: 101, cover: 'https://picsum.photos/seed/fantasy4/200/300', description: 'A dark fantasy saga of power and betrayal.' },
      { id: 'b5', title: 'Starship Chronicles', author: 'Jaxon Reed', authorId: 'author3', genre: 'fiction', subGenre: 'scifi', bookstore: 'Learn & Play', price: 24.99, rating: 4.22, raters: 78, cover: 'https://picsum.photos/seed/scifi1/200/300', description: 'Adventures aboard a starship exploring unknown galaxies.' },
      { id: 'b6', title: 'Galactic Outlaws', author: 'Jaxon Reed', authorId: 'author3', genre: 'fiction', subGenre: 'scifi', bookstore: 'Learn & Play', price: 23.99, rating: 4.33, raters: 90, cover: 'https://picsum.photos/seed/scifi2/200/300', description: 'A thrilling sci-fi tale of rebels and rogues.' },
      { id: 'b7', title: 'Time Vortex', author: 'Luna Starr', authorId: 'author4', genre: 'fiction', subGenre: 'scifi', bookstore: 'Sci-Fi Store', price: 21.99, rating: 4.5, raters: 100, cover: 'https://picsum.photos/seed/scifi3/200/300', description: 'A mind-bending journey through time and space.' },
      { id: 'b8', title: 'Cyber Dawn', author: 'Luna Starr', authorId: 'author4', genre: 'fiction', subGenre: 'scifi', bookstore: 'Sci-Fi Store', price: 22.99, rating: 4.44, raters: 85, cover: 'https://picsum.photos/seed/scifi4/200/300', description: 'A futuristic world where technology rules.' },
      { id: 'b9', title: 'Quantum Mechanics', author: 'John Doe', authorId: 'author5', genre: 'nonfiction', subGenre: 'academics', bookstore: 'Learn & Play', price: 29.99, rating: 4.88, raters: 200, cover: 'https://picsum.photos/seed/quantum/200/300', description: 'A comprehensive guide to quantum physics.' },
      { id: 'b10', title: 'Relativity Explained', author: 'John Doe', authorId: 'author5', genre: 'nonfiction', subGenre: 'academics', bookstore: 'Learn & Play', price: 27.99, rating: 4.77, raters: 180, cover: 'https://picsum.photos/seed/relativity/200/300', description: 'An accessible introduction to Einstein’s theories.' },
      { id: 'b11', title: 'The Universe Unveiled', author: 'Emma Wright', authorId: 'author6', genre: 'nonfiction', subGenre: 'academics', bookstore: 'Science Reads', price: 25.99, rating: 4.99, raters: 150, cover: 'https://picsum.photos/seed/universe/200/300', description: 'Exploring the mysteries of the cosmos.' },
      { id: 'b12', title: 'Biology Today', author: 'Emma Wright', authorId: 'author6', genre: 'nonfiction', subGenre: 'academics', bookstore: 'Science Reads', price: 26.99, rating: 4.66, raters: 130, cover: 'https://picsum.photos/seed/biology/200/300', description: 'Modern insights into biological sciences.' },
      { id: 'b13', title: 'Mere Christianity', author: 'C.S. Lewis', authorId: 'author7', genre: 'nonfiction', subGenre: 'theology', bookstore: 'Faith Books', price: 14.99, rating: 4.88, raters: 300, cover: 'https://picsum.photos/seed/theology1/200/300', description: 'A classic exploration of Christian faith.' },
      { id: 'b14', title: 'The Screwtape Letters', author: 'C.S. Lewis', authorId: 'author7', genre: 'nonfiction', subGenre: 'theology', bookstore: 'Faith Books', price: 15.99, rating: 4.7, raters: 250, cover: 'https://picsum.photos/seed/theology2/200/300', description: 'A satirical take on spiritual warfare.' },
      { id: 'b15', title: 'Faith and Reason', author: 'Thomas Kane', authorId: 'author8', genre: 'nonfiction', subGenre: 'theology', bookstore: 'Faith Books', price: 16.99, rating: 4.5, raters: 160, cover: 'https://picsum.photos/seed/theology3/200/300', description: 'Bridging faith and rational thought.' },
      { id: 'b16', title: 'Spiritual Journeys', author: 'Thomas Kane', authorId: 'author8', genre: 'nonfiction', subGenre: 'theology', bookstore: 'Faith Books', price: 17.99, rating: 4.6, raters: 140, cover: 'https://picsum.photos/seed/theology4/200/300', description: 'Personal stories of spiritual growth.' },
      { id: 'b17', title: 'Hearts Entwined', author: 'Clara Rose', authorId: 'author9', genre: 'fiction', subGenre: 'romance', bookstore: 'Love Reads', price: 15.99, rating: 4.3, raters: 95, cover: 'https://picsum.photos/seed/romance1/200/300', description: 'A passionate tale of love overcoming obstacles.' },
      { id: 'b18', title: 'Whispers of Forever', author: 'Clara Rose', authorId: 'author9', genre: 'fiction', subGenre: 'romance', bookstore: 'Love Reads', price: 16.99, rating: 4.4, raters: 110, cover: 'https://picsum.photos/seed/romance2/200/300', description: 'A story of enduring love across time.' },
      { id: 'b19', title: 'Love’s Last Chance', author: 'Lila Hart', authorId: 'author10', genre: 'fiction', subGenre: 'romance', bookstore: 'Love Reads', price: 14.99, rating: 4.2, raters: 85, cover: 'https://picsum.photos/seed/romance3/200/300', description: 'A heartfelt journey of second chances.' },
      { id: 'b20', title: 'Eternal Embrace', author: 'Lila Hart', authorId: 'author10', genre: 'fiction', subGenre: 'romance', bookstore: 'Love Reads', price: 17.99, rating: 4.5, raters: 120, cover: 'https://picsum.photos/seed/romance4/200/300', description: 'A romantic saga of unbreakable bonds.' }
    ];

    const authorData = {
      'author1': {
        name: 'Elara Stone',
        about: 'Renowned fantasy author with a passion for mythical worlds.',
        quotes: ['Imagination is the key to adventure.', 'Magic lies in every story.'],
        socials: { twitter: 'elara_stone', instagram: 'elara.stone' },
        reviews: ['Inspiring and creative!', 'Epic storytelling.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author1/100/100',
        coverPhoto: 'https://picsum.photos/seed/author1/600/150'
      },
      'author2': {
        name: 'Mira Vale',
        about: 'Fantasy author known for intricate worlds and compelling characters.',
        quotes: ['Every tale weaves a new destiny.', 'Dreams shape reality.'],
        socials: { twitter: 'mira_vale', instagram: 'mira.vale' },
        reviews: ['Captivating narratives!', 'A master of fantasy.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author2/100/100',
        coverPhoto: 'https://picsum.photos/seed/author2/600/150'
      },
      'author3': {
        name: 'Jaxon Reed',
        about: 'Sci-fi visionary exploring the cosmos.',
        quotes: ['The stars are our destiny.', 'Technology shapes the future.'],
        socials: { twitter: 'jaxon_reed', instagram: 'jaxon_reed' },
        reviews: ['Mind-bending narratives!', 'Innovative sci-fi plots.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author3/100/100',
        coverPhoto: 'https://picsum.photos/seed/author3/600/150'
      },
      'author4': {
        name: 'Luna Starr',
        about: 'Sci-fi author with a focus on time travel and cybernetics.',
        quotes: ['Time is a river we navigate.', 'The future is now.'],
        socials: { twitter: 'luna_starr', instagram: 'luna.starr' },
        reviews: ['Thrilling and thought-provoking!', 'A sci-fi gem.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author4/100/100',
        coverPhoto: 'https://picsum.photos/seed/author4/600/150'
      },
      'author5': {
        name: 'John Doe',
        about: 'Physicist and educator specializing in quantum mechanics.',
        quotes: ['Science unlocks the universe.', 'Knowledge is power.'],
        socials: { twitter: 'john_doe', instagram: 'john.doe' },
        reviews: ['Clear and insightful!', 'A must-read for science enthusiasts.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author5/100/100',
        coverPhoto: 'https://picsum.photos/seed/author5/600/150'
      },
      'author6': {
        name: 'Emma Wright',
        about: 'Academic author with expertise in cosmology and biology.',
        quotes: ['The universe is a book to read.', 'Life is the ultimate experiment.'],
        socials: { twitter: 'emma_wright', instagram: 'emma_wright' },
        reviews: ['Brilliant and accessible!', 'Deeply informative.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author6/100/100',
        coverPhoto: 'https://picsum.photos/seed/author6/600/150'
      },
      'author7': {
        name: 'C.S. Lewis',
        about: 'Theologian and author of inspirational works.',
        quotes: ['Faith shapes the soul.', 'Love is the greatest adventure.'],
        socials: { twitter: 'cs_lewis', instagram: 'cs_lewis' },
        reviews: ['Profound and thought-provoking!', 'Timeless wisdom.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author7/100/100',
        coverPhoto: 'https://picsum.photos/seed/author7/600/150'
      },
      'author8': {
        name: 'Thomas Kane',
        about: 'Theologian exploring the intersection of faith and reason.',
        quotes: ['Reason leads to faith.', 'Spirituality is a journey.'],
        socials: { twitter: 'thomas_kane', instagram: 'thomas_kane' },
        reviews: ['Insightful and inspiring!', 'A fresh perspective on theology.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author8/100/100',
        coverPhoto: 'https://picsum.photos/seed/author8/600/150'
      },
      'author9': {
        name: 'Clara Rose',
        about: 'Romance novelist with a flair for heartfelt stories.',
        quotes: ['Love conquers all.', 'Every heart has a story.'],
        socials: { twitter: 'clara_rose', instagram: 'clara.rose' },
        reviews: ['Heartwarming and emotional!', 'A romantic masterpiece.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author9/100/100',
        coverPhoto: 'https://picsum.photos/seed/author9/600/150'
      },
      'author10': {
        name: 'Lila Hart',
        about: 'Author of captivating romance novels.',
        quotes: ['Love is the ultimate adventure.', 'Hearts find a way.'],
        socials: { twitter: 'lila_hart', instagram: 'lila.hart' },
        reviews: ['Touching and beautifully written!', 'A romance classic.'],
        videos: { intro: ['https://www.youtube.com/embed/dQw4w9WgXcQ'], shorts: [], videos: [], playlists: [] },
        profilePic: 'https://picsum.photos/seed/author10/100/100',
        coverPhoto: 'https://picsum.photos/seed/author10/600/150'
      }
    };

    // Initialize currentUser with fallback
    let currentUser;
    try {
      const storedUser = localStorage.getItem('currentUser');
      currentUser = storedUser ? JSON.parse(storedUser) : { id: 'user1', favorites: [], following: [], ratings: [], profileType: 'default' };
      currentUser.favorites = Array.isArray(currentUser.favorites) ? currentUser.favorites : [];
      currentUser.following = Array.isArray(currentUser.following) ? currentUser.following : [];
      currentUser.ratings = Array.isArray(currentUser.ratings) ? currentUser.ratings : [];
      currentUser.profileType = currentUser.profileType || 'default';
    } catch (error) {
      console.error('Error parsing localStorage:', error);
      currentUser = { id: 'user1', favorites: [], following: [], ratings: [], profileType: 'default' };
    }

    let currentBookId = null;
    let currentAuthorId = null;
    let currentCategory = null;

    // Utility Functions
    const sanitizeInput = input => {
      const div = document.createElement('div');
      div.textContent = input;
      return div.innerHTML;
    };

    const showNotification = (message, type = 'info') => {
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'} z-50`;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    };

    // Dynamic Profile Dropdown
    function updateProfileDropdown() {
      const dropdown = document.getElementById('profileDropdown');
      if (!dropdown) {
        console.error('Profile dropdown not found');
        return;
      }
      const defaultItems = `
        <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Notes">Notes</a>
        <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Manage Finances">Manage Finances</a>
        <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Comment and Rate Astegni">Comment and Rate Astegni</a>
        <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Books">Books</a>
      `;
      let additionalItems = '';
      if (currentUser.profileType === 'tutor') {
        additionalItems = `
          <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Tools">Tools</a>
          <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Take a Quiz">Take a Quiz</a>
        `;
      } else if (currentUser.profileType === 'student') {
        additionalItems = `
          <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Tools">Tools</a>
          <a href="#" class="block px-4 py-2 text-gray-800 hover:bg-gray-100" aria-label="Become a Tutor">Become a Tutor</a>
        `;
      }
      dropdown.innerHTML = defaultItems + additionalItems;
    }

    // Book Card Creation
    function createBookCard(book) {
      const isFavorited = Array.isArray(currentUser.favorites) && currentUser.favorites.includes(book.id);
      return `
        <div class="book-card bg-white rounded-lg shadow relative">
          <button class="favorite-icon absolute top-2 right-2 text-2xl ${isFavorited ? 'favorited' : ''}" onclick="addToFavorites('${book.id}')" aria-label="${isFavorited ? 'Remove from' : 'Add to'} favorites">${isFavorited ? '★' : '☆'}</button>
          <img src="${book.cover}" alt="${sanitizeInput(book.title)} cover" class="w-full h-48 object-cover rounded-t-lg" loading="lazy">
          <div class="book-card-content p-4">
            <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(book.title)}</h3>
            <p class="text-gray-600">by <a href="#" class="author-link text-blue-600 hover:underline" onclick="openAuthorModal('${book.authorId}', '${book.id}')" aria-label="View ${sanitizeInput(book.author)}'s profile">${sanitizeInput(book.author)}</a></p>
            <p class="text-gray-600 italic">Posted by: <a href="view-bookstore.html" class="text-purple-600 hover:underline" aria-label="View bookstore ${sanitizeInput(book.bookstore)}">${sanitizeInput(book.bookstore)}</a></p>
            <p class="text-gray-600">Price: $${book.price.toFixed(2)}</p>
            <p class="text-gray-600">Rating: ${book.rating.toFixed(1)} <span class="text-yellow-500">★</span> (${book.raters || 0})</p>
            <div class="actions flex gap-2 mt-2">
              <a href="#" onclick="openBookModal('${book.id}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1 text-center" aria-label="View details of ${sanitizeInput(book.title)}">View Details</a>
              <button onclick="addToCart('${book.id}')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1" aria-label="Add ${sanitizeInput(book.title)} to cart">Add to Cart</button>
            </div>
          </div>
        </div>
      `;
    }

    // Populate Books
    function populateBooks(category = null, filteredBooks = books) {
      const containers = {
        homeFantasyBooks: filteredBooks.filter(b => b.subGenre === 'fantasy').slice(0, 3),
        homeScifiBooks: filteredBooks.filter(b => b.subGenre === 'scifi').slice(0, 3),
        homeRomanceBooks: filteredBooks.filter(b => b.subGenre === 'romance').slice(0, 3),
        homeAcademicsBooks: filteredBooks.filter(b => b.subGenre === 'academics').slice(0, 3),
        homeTheologyBooks: filteredBooks.filter(b => b.subGenre === 'theology').slice(0, 3),
        fantasyBooks: filteredBooks.filter(b => b.subGenre === 'fantasy'),
        scifiBooks: filteredBooks.filter(b => b.subGenre === 'scifi'),
        romanceBooks: filteredBooks.filter(b => b.subGenre === 'romance'),
        academicsBooks: filteredBooks.filter(b => b.subGenre === 'academics'),
        theologyBooks: filteredBooks.filter(b => b.subGenre === 'theology')
      };

      const noBooksMessages = [document.getElementById('noBooksMessage'), document.getElementById('noBooksMessageBooks')];

      if (filteredBooks.length === 0) {
        Object.keys(containers).forEach(id => {
          const container = document.getElementById(id);
          if (container) container.innerHTML = '';
        });
        noBooksMessages.forEach(msg => {
          if (msg) msg.classList.remove('hidden');
        });
        return;
      } else {
        noBooksMessages.forEach(msg => {
          if (msg) msg.classList.add('hidden');
        });
      }

      const categorySubGenres = {
        fiction: ['fantasy', 'scifi', 'romance'],
        nonfiction: ['academics', 'theology'],
        fantasy: ['fantasy'],
        scifi: ['scifi'],
        romance: ['romance'],
        academics: ['academics'],
        theology: ['theology']
      };

      Object.keys(containers).forEach(id => {
        const container = document.getElementById(id);
        if (!container) {
          console.warn(`Container with ID ${id} not found`);
          return;
        }
        if (category) {
          const subGenres = categorySubGenres[category] || [];
          const containerSubGenre = id.replace(/^(home|Books)/, '').toLowerCase();
          if (subGenres.includes(containerSubGenre)) {
            container.innerHTML = containers[id].map(book => createBookCard(book)).join('');
            container.parentElement.classList.remove('hidden');
          } else {
            container.innerHTML = '';
            container.parentElement.classList.add('hidden');
          }
        } else {
          container.innerHTML = containers[id].map(book => createBookCard(book)).join('');
          container.parentElement.classList.remove('hidden');
        }
      });
    }

    // Sort and Filter Books
    function sortBooks(criteria = null) {
      const searchInput = document.getElementById('search-input');
      const searchQuery = searchInput?.value?.toLowerCase() || '';
      let filteredBooks = [...books];
      if (searchQuery) {
        filteredBooks = filteredBooks.filter(b =>
          b.title.toLowerCase().includes(searchQuery) ||
          b.author.toLowerCase().includes(searchQuery) ||
          b.bookstore.toLowerCase().includes(searchQuery) ||
          b.description.toLowerCase().includes(searchQuery)
        );
      }
      if (criteria) {
        filteredBooks.sort((a, b) => {
          if (criteria === 'title') return a.title.localeCompare(b.title);
          if (criteria === 'author') return a.author.localeCompare(b.author);
          if (criteria === 'rating') return b.rating - a.rating;
          return 0;
        });
      }
      populateBooks(currentCategory, filteredBooks);
    }

    // Navigation Functions
    function showStore() {
      const sections = ['homeSection', 'booksSection', 'gamesSection'];
      const homeSection = document.getElementById('homeSection');
      const bookFilters = document.getElementById('bookFilters');
      const sidebar = document.getElementById('sidebar');
      const fictionSection = document.getElementById('fictionSection');
      const nonfictionSection = document.getElementById('nonfictionSection');
      if (homeSection && bookFilters && sidebar && fictionSection && nonfictionSection) {
        sections.forEach(id => {
          const section = document.getElementById(id);
          if (section) section.classList.add('hidden');
        });
        homeSection.classList.remove('hidden');
        bookFilters.classList.remove('hidden', 'lg:hidden');
        fictionSection.classList.remove('hidden');
        nonfictionSection.classList.remove('hidden');
        sidebar.classList.remove('active');
        currentCategory = null;
        populateBooks();
        sortBooks();
      } else {
        console.error('One or more section elements not found');
      }
    }

    function showBooks() {
      const sections = ['homeSection', 'booksSection', 'gamesSection'];
      const booksSection = document.getElementById('booksSection');
      const bookFilters = document.getElementById('bookFilters');
      const sidebar = document.getElementById('sidebar');
      const fictionSection = document.getElementById('fictionSection');
      const nonfictionSection = document.getElementById('nonfictionSection');
      if (booksSection && bookFilters && sidebar && fictionSection && nonfictionSection) {
        sections.forEach(id => {
          const section = document.getElementById(id);
          if (section) section.classList.add('hidden');
        });
        booksSection.classList.remove('hidden');
        bookFilters.classList.remove('hidden', 'lg:hidden');
        fictionSection.classList.remove('hidden');
        nonfictionSection.classList.remove('hidden');
        sidebar.classList.remove('active');
        currentCategory = null;
        populateBooks();
        sortBooks();
      } else {
        console.error('One or more books section elements not found');
      }
    }

    function showGames() {
      const sections = ['homeSection', 'booksSection', 'gamesSection'];
      const gamesSection = document.getElementById('gamesSection');
      const bookFilters = document.getElementById('bookFilters');
      const sidebar = document.getElementById('sidebar');
      if (gamesSection && bookFilters && sidebar) {
        sections.forEach(id => {
          const section = document.getElementById(id);
          if (section) section.classList.add('hidden');
        });
        gamesSection.classList.remove('hidden');
        bookFilters.classList.add('hidden', 'lg:hidden');
        sidebar.classList.remove('active');
        currentCategory = null;
      } else {
        console.error('One or more games section elements not found');
      }
    }

    function showCategory(category) {
      const booksSection = document.getElementById('booksSection');
      const homeSection = document.getElementById('homeSection');
      const gamesSection = document.getElementById('gamesSection');
      const bookFilters = document.getElementById('bookFilters');
      const sidebar = document.getElementById('sidebar');
      const fictionSection = document.getElementById('fictionSection');
      const nonfictionSection = document.getElementById('nonfictionSection');
      if (booksSection && homeSection && gamesSection && bookFilters && sidebar && fictionSection && nonfictionSection) {
        homeSection.classList.add('hidden');
        booksSection.classList.remove('hidden');
        gamesSection.classList.add('hidden');
        bookFilters.classList.remove('hidden', 'lg:hidden');
        sidebar.classList.remove('active');

        currentCategory = category;

        const subGenreSections = ['fantasy', 'scifi', 'romance', 'academics', 'theology'].map(s => document.getElementById(`${s}Books`)?.parentElement);
        subGenreSections.forEach(section => {
          if (section) section.classList.add('hidden');
        });

        if (category === 'fiction') {
          fictionSection.classList.remove('hidden');
          nonfictionSection.classList.add('hidden');
          ['fantasy', 'scifi', 'romance'].forEach(subGenre => {
            const subGenreSection = document.getElementById(`${subGenre}Books`)?.parentElement;
            if (subGenreSection) subGenreSection.classList.remove('hidden');
          });
        } else if (category === 'nonfiction') {
          fictionSection.classList.add('hidden');
          nonfictionSection.classList.remove('hidden');
          ['academics', 'theology'].forEach(subGenre => {
            const subGenreSection = document.getElementById(`${subGenre}Books`)?.parentElement;
            if (subGenreSection) subGenreSection.classList.remove('hidden');
          });
        } else {
          fictionSection.classList.remove('hidden');
          nonfictionSection.classList.remove('hidden');
          const subGenreSection = document.getElementById(`${category}Books`)?.parentElement;
          if (subGenreSection) {
            subGenreSection.classList.remove('hidden');
            subGenreSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
        populateBooks(category);
        sortBooks();
      } else {
        console.error(`Category section or elements not found for ${category}`);
      }
    }

    // Modal Functions
    function openNotificationModal() {
      const modal = document.getElementById('notificationModal');
      if (modal) {
        modal.classList.add('open');
        const notificationIcon = document.querySelector('.notification-icon');
        if (notificationIcon) notificationIcon.classList.remove('active');
      } else {
        console.error('Notification modal not found');
        showNotification('Error: Notification modal not found', 'error');
      }
    }

    function openAuthorModal(authorId, bookId) {
      currentAuthorId = authorId;
      currentBookId = bookId;
      const modal = document.getElementById('authorModal');
      const modalSpinner = document.getElementById('modalSpinner');
      if (!modal || !modalSpinner) {
        console.error('Author modal or spinner not found:', { modal, modalSpinner });
        showNotification('Error: Author modal not found', 'error');
        return;
      }
      modalSpinner.style.display = 'block';
      setTimeout(() => {
        const data = authorData[authorId] || {};
        const book = books.find(b => b.id === bookId);
        const isFavorited = Array.isArray(currentUser.favorites) && currentUser.favorites.includes(bookId);

        const authorCoverPhoto = document.getElementById('authorCoverPhoto');
        const authorProfilePic = document.getElementById('authorProfilePic');
        const authorName = document.getElementById('authorName');
        const authorAbout = document.getElementById('authorAbout');
        const authorQuotes = document.getElementById('authorQuotes');
        const authorSocials = document.getElementById('authorSocials');
        const followButton = document.getElementById('followButton');
        const currentBookDetails = document.getElementById('currentBookDetails');
        const introVideo = document.getElementById('introVideo');
        const shorts = document.getElementById('shorts');
        const videosSub = document.getElementById('videosSub');
        const playlists = document.getElementById('playlists');
        const authorOtherBooks = document.getElementById('authorOtherBooks');
        const authorTabName = document.getElementById('authorTabName');

        if (!authorCoverPhoto || !authorProfilePic || !authorName || !authorAbout || !authorQuotes ||
          !authorSocials || !followButton || !currentBookDetails || !introVideo || !shorts ||
          !videosSub || !playlists || !authorOtherBooks || !authorTabName) {
          console.error('One or more author modal elements not found');
          showNotification('Error: Author modal elements missing', 'error');
          modalSpinner.style.display = 'none';
          return;
        }

        const coverPhotoUrl = data.coverPhoto && /^https:\/\/picsum\.photos\/seed\/[^/]+\/\d+\/\d+$/.test(data.coverPhoto)
          ? data.coverPhoto
          : 'https://picsum.photos/600/150';
        authorCoverPhoto.src = coverPhotoUrl;
        authorProfilePic.src = data.profilePic || 'https://picsum.photos/100/100';
        authorName.textContent = data.name || 'Unknown Author';
        authorAbout.textContent = data.about || 'No information available.';
        authorQuotes.textContent = data.quotes?.join(', ') || 'No quotes available.';
        authorSocials.innerHTML = Object.entries(data.socials || []).map(([key, value]) =>
          `<a href="https://${key}.com/${value}" target="_blank" class="text-blue-600 hover:underline" aria-label="Visit ${data.name || 'Author'}'s ${key}">${key}</a>`
        ).join(' | ') || 'No socials available.';
        followButton.textContent = Array.isArray(currentUser.following) && currentUser.following.includes(authorId) ? 'Unfollow' : 'Follow';

        currentBookDetails.innerHTML = book ? `
          <div class="flex gap-4 mb-4">
            <img src="${book.cover}" alt="${sanitizeInput(book.title)} cover" class="w-32 h-48 object-cover rounded" loading="lazy">
            <div class="flex-1">
              <h4 class="text-base font-semibold text-gray-800">${sanitizeInput(book.title)}</h4>
              <p class="text-gray-600">Rating: ${sanitizeInput(book.rating.toFixed(1))} <span class="text-yellow-500">★</span> (${sanitizeInput((book.raters || 0).toString())})</p>
              <button class="text-2xl ${isFavorited ? 'favorited text-yellow-500' : 'text-gray-500'}" onclick="addToFavorites('${book.id}')" aria-label="${isFavorited ? 'Remove from' : 'Add to'} favorites">${isFavorited ? '★' : '☆'}</button>
              <p class="text-gray-600">Price: $${sanitizeInput(book.price.toFixed(2))}</p>
              <p class="text-gray-600">Posted by: <a href="view-bookstore.html" class="text-purple-600 hover:underline" aria-label="View bookstore ${sanitizeInput(book.bookstore)}">${sanitizeInput(book.bookstore)}</a></p>
              <div class="flex gap-2 mt-2">
                <button onclick="addToCartFromModal('${bookId}')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" aria-label="Add ${sanitizeInput(book.title)} to cart">Add to Cart</button>
                <a href="#" onclick="openBookModal('${bookId}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" aria-label="View details of ${sanitizeInput(book.title)}">View Details</a>
              </div>
            </div>
          </div>
        ` : '<p>No book details available.</p>';

        introVideo.innerHTML = (data.videos?.intro || []).map(video =>
          `<iframe class="w-full h-48" src="${video}" frameborder="0" allowfullscreen aria-label="Author introduction video"></iframe>`
        ).join('') || '<p>No introduction video.</p>';
        shorts.innerHTML = (data.videos?.shorts || []).map(video => `<p>${sanitizeInput(video)}</p>`).join('') || '<p>No shorts available.</p>';
        videosSub.innerHTML = (data.videos?.videos || []).map(video => `<p>${sanitizeInput(video)}</p>`).join('') || '<p>No videos available.</p>';
        playlists.innerHTML = (data.videos?.playlists || []).map(video => `<p>${sanitizeInput(video)}</p>`).join('') || '<p>No playlists available.</p>';
        authorOtherBooks.innerHTML = books.filter(b => b.authorId === authorId && b.id !== bookId).map(b => createBookCard(b)).join('') || '<p>No other books found.</p>';
        authorTabName.textContent = data.name || '';

        const tabs = document.querySelectorAll('.tabs .tab');
        const tabContents = document.querySelectorAll('.tab-content');
        const videoTab = document.querySelector('.tab[data-tab="videos"]');
        const subTabs = document.querySelectorAll('.sub-tabs .sub-tab');
        const subTabContents = document.querySelectorAll('.sub-tab-content');
        const shortsSubTab = document.querySelector('.sub-tab[data-sub-tab="shorts"]');

        if (!tabs || !tabContents || !videoTab || !subTabs || !subTabContents || !shortsSubTab) {
          console.error('Tab or sub-tab elements not found');
          showNotification('Error: Tab elements missing', 'error');
          modalSpinner.style.display = 'none';
          return;
        }

        tabs.forEach(tab => {
          tab.classList.remove('active-tab');
          tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active-tab'));
            tab.classList.add('active-tab');
            tabContents.forEach(content => content.classList.add('hidden'));
            document.getElementById(tab.dataset.tab).classList.remove('hidden');
          });
        });
        videoTab.classList.add('active-tab');
        tabContents.forEach(content => content.classList.add('hidden'));
        document.getElementById('videos').classList.remove('hidden');

        subTabs.forEach(subTab => {
          subTab.classList.remove('sub-tab-active');
          subTab.addEventListener('click', () => {
            subTabs.forEach(st => st.classList.remove('sub-tab-active'));
            subTab.classList.add('sub-tab-active');
            subTabContents.forEach(content => content.classList.add('hidden'));
            document.getElementById(subTab.dataset.subTab).classList.remove('hidden');
          });
        });
        shortsSubTab.classList.add('sub-tab-active');
        subTabContents.forEach(content => content.classList.add('hidden'));
        document.getElementById('shorts').classList.remove('hidden');

        modal.classList.add('open');
        modalSpinner.style.display = 'none';
      }, 500);
    }

    function openBookModal(bookId) {
      currentBookId = bookId;
      const modal = document.getElementById('bookModal');
      const modalSpinner = document.getElementById('bookModalSpinner');
      if (!modal || !modalSpinner) {
        console.error('Book modal or spinner not found:', { modal, modalSpinner });
        showNotification('Error: Book modal not found', 'error');
        return;
      }
      modalSpinner.style.display = 'block';
      setTimeout(() => {
        const book = books.find(b => b.id === bookId);
        if (!book) {
          console.error('Book not found:', bookId);
          showNotification('Error: Book not found', 'error');
          modalSpinner.style.display = 'none';
          return;
        }
        const bookVideo = document.getElementById('bookVideo');
        const bookTitle = document.getElementById('bookTitle');
        const bookAuthorLink = document.getElementById('bookAuthorLink');
        const bookDescription = document.getElementById('bookDescription');
        const bookRating = document.getElementById('bookRating');
        const bookPrice = document.getElementById('bookPrice');
        const relatedBooks = document.getElementById('relatedBooks');
        if (!bookVideo || !bookTitle || !bookAuthorLink || !bookDescription || !bookRating || !bookPrice || !relatedBooks) {
          console.error('One or more book modal elements not found');
          showNotification('Error: Book modal elements missing', 'error');
          modalSpinner.style.display = 'none';
          return;
        }
        bookVideo.innerHTML = `<iframe class="w-full h-48" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen aria-label="Book introduction video"></iframe>`;
        bookTitle.textContent = book.title || 'Unknown Title';
        bookAuthorLink.innerHTML = `<a href="#" onclick="openAuthorModal('${book.authorId}', '${book.id}')" class="text-blue-600 hover:underline" aria-label="View ${sanitizeInput(book.author)}'s profile">${sanitizeInput(book.author)}</a>`;
        bookDescription.textContent = book.description || 'No description available.';
        bookRating.textContent = `Rating: ${book.rating.toFixed(1)} ★ (${book.raters || 0})`;
        bookPrice.textContent = `Price: $${book.price.toFixed(2)}`;
        relatedBooks.innerHTML = books
          .filter(b => b.subGenre === book.subGenre && b.id !== bookId)
          .slice(0, 3)
          .map(b => createBookCard(b))
          .join('') || '<p>No related books found.</p>';
        modal.classList.add('open');
        modalSpinner.style.display = 'none';
      }, 500);
    }

    function openRequestBookModal() {
      const modal = document.getElementById('requestBookModal');
      if (modal) {
        modal.classList.add('open');
        document.getElementById('requestBookTitle').value = '';
        document.getElementById('requestBookAuthor').value = '';
        document.getElementById('requestPublishedYear').value = '';
        document.getElementById('requestBookDescription').value = '';
      } else {
        console.error('Request book modal not found');
        showNotification('Error: Request book modal not found', 'error');
      }
    }

    function submitBookRequest() {
      const title = document.getElementById('requestBookTitle')?.value;
      const author = document.getElementById('requestBookAuthor')?.value;
      const year = document.getElementById('requestPublishedYear')?.value;
      const description = document.getElementById('requestBookDescription')?.value;
      if (!title && !author && !description) {
        showNotification('Please provide at least one of title, author, or description', 'error');
        return;
      }
      const request = { title, author, year, description, timestamp: new Date().toISOString() };
      let requests = JSON.parse(localStorage.getItem('bookRequests') || '[]');
      requests.push(request);
      localStorage.setItem('bookRequests', JSON.stringify(requests));
      showNotification('Book request submitted successfully', 'success');
      closeModal();
    }

    function openReviews() {
      const modal = document.getElementById('reviewsModal');
      const bookReviews = document.getElementById('bookReviews');
      if (!modal || !bookReviews) {
        console.error('Reviews modal or content not found');
        showNotification('Error: Reviews modal not found', 'error');
        return;
      }
      const reviews = currentBookId
        ? books.find(b => b.id === currentBookId)?.reviews || []
        : authorData[currentAuthorId]?.reviews || [];
      bookReviews.innerHTML = reviews.length
        ? reviews.map(r => `<p class="mb-2">${sanitizeInput(r)}</p>`).join('')
        : '<p>No reviews available.</p>';
      modal.classList.add('open');
    }

    function closeModal() {
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => modal.classList.remove('open'));
      document.getElementById('ratingCommentModal')?.classList.remove('open');
      document.getElementById('requestBookModal')?.classList.remove('open');
      document.getElementById('notificationModal')?.classList.remove('open');
    }

    function addToCart(bookId) {
      currentUser.cart = currentUser.cart || [];
      if (!currentUser.cart.includes(bookId)) {
        currentUser.cart.push(bookId);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Added to cart', 'success');
      } else {
        showNotification('Book already in cart', 'error');
      }
    }

    function addToCartFromModal() {
      if (currentBookId) addToCart(currentBookId);
    }

    function addToWishlist() {
      if (!currentBookId) {
        console.error('No book selected for wishlist');
        showNotification('Error: No book selected', 'error');
        return;
      }
      addToFavorites(currentBookId);
    }

    function addToFavorites(bookId) {
      const index = currentUser.favorites.indexOf(bookId);
      if (index === -1) {
        currentUser.favorites.push(bookId);
        showNotification('Added to favorites', 'success');
      } else {
        currentUser.favorites.splice(index, 1);
        showNotification('Removed from favorites', 'success');
      }
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      populateBooks(currentCategory);
      const modalFavoriteButton = document.querySelector(`#currentBookDetails button[aria-label*='favorites']`);
      if (modalFavoriteButton) {
        const isFavorited = currentUser.favorites.includes(bookId);
        modalFavoriteButton.textContent = isFavorited ? '★' : '☆';
        modalFavoriteButton.classList.toggle('favorited', isFavorited);
        modalFavoriteButton.classList.toggle('text-yellow-500', isFavorited);
        modalFavoriteButton.classList.toggle('text-gray-500', !isFavorited);
        modalFavoriteButton.setAttribute('aria-label', isFavorited ? 'Remove from favorites' : 'Add to favorites');
      }
    }

    function followAuthor() {
      if (!currentAuthorId) {
        console.error('No author selected to follow');
        showNotification('Error: No author selected', 'error');
        return;
      }
      const index = currentUser.following.indexOf(currentAuthorId);
      const followButton = document.getElementById('followButton');
      if (index === -1) {
        currentUser.following.push(currentAuthorId);
        showNotification(`Followed ${authorData[currentAuthorId].name}`);
      } else {
        currentUser.following.splice(index, 1);
        showNotification(`Unfollowed ${authorData[currentAuthorId].name}`);
      }
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      if (followButton) {
        followButton.textContent = index === -1 ? 'Unfollow' : 'Follow';
      } else {
        console.error('Follow button not found');
        showNotification('Error: Follow button not found', 'error');
      }
    }

    function submitAuthorRatingComment() {
      const rating = document.getElementById('authorRating')?.value;
      const comment = document.getElementById('authorComment')?.value;
      if (!rating || !comment) {
        showNotification('Please provide both rating and comment', 'error');
        return;
      }
      if (currentAuthorId && authorData[currentAuthorId]) {
        authorData[currentAuthorId].reviews = authorData[currentAuthorId].reviews || [];
        authorData[currentAuthorId].reviews.push(`Rating: ${rating} ★ - ${sanitizeInput(comment)}`);
        currentUser.ratings = currentUser.ratings || [];
        currentUser.ratings.push({ authorId: currentAuthorId, rating, comment });
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Author rating submitted successfully', 'success');
        closeModal();
      } else {
        console.error('Author not found for rating:', currentAuthorId);
        showNotification('Error: Author not found', 'error');
      }
    }

    function submitBookRatingComment() {
      const rating = document.getElementById('bookRating')?.value;
      const comment = document.getElementById('bookComment')?.value;
      if (!rating || !comment) {
        showNotification('Please provide both rating and comment', 'error');
        return;
      }
      const book = books.find(b => b.id === currentBookId);
      if (book) {
        book.raters = (book.raters || 0) + 1;
        book.rating = ((book.rating * (book.raters - 1) + parseInt(rating)) / book.raters).toFixed(1);
        book.reviews = book.reviews || [];
        book.reviews.push(`Rating: ${rating} ★ - ${sanitizeInput(comment)}`);
        currentUser.ratings = currentUser.ratings || [];
        currentUser.ratings.push({ bookId: currentBookId, rating, comment });
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Book rating submitted successfully', 'success');
        closeModal();
        populateBooks(currentCategory);
      } else {
        console.error('Book not found for rating:', currentBookId);
        showNotification('Error: Book not found', 'error');
      }
    }

    function toggleProfileDropdown(event) {
      event.preventDefault(); // Prevent navigation to profile.html when clicking to toggle dropdown
      const dropdown = document.getElementById('profileDropdown');
      if (dropdown) {
        dropdown.classList.toggle('active');
      } else {
        console.error('Profile dropdown not found');
        showNotification('Error: Profile dropdown not found', 'error');
      }
    }

    function toggleTheme() {
      document.body.classList.toggle('dark');
      localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    }

    function sidebarToggle() {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.toggle('active');
      } else {
        console.error('Sidebar not found');
        showNotification('Error: Sidebar not found', 'error');
      }
    }

    // Search Functionality
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      const searchQuery = e.target.value.toLowerCase();
      if (!searchQuery) {
        showBooks();
        populateBooks();
      } else {
        sortBooks();
      }
    });

    // Initialize Page
    document.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark');
      }
      // Simulate determining profile type based on referrer
      const referrer = document.referrer || '';
      if (referrer.includes('tutor-profile.html')) {
        currentUser.profileType = 'tutor';
      } else if (referrer.includes('student-profile.html')) {
        currentUser.profileType = 'student';
      } else if (referrer.includes('parents-profile.html') ||
        referrer.includes('advertiser-profile.html') ||
        referrer.includes('training-center-profile.html') ||
        referrer.includes('bookstore-profile.html')) {
        currentUser.profileType = 'other';
      } else {
        currentUser.profileType = 'default';
      }
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateProfileDropdown();
      showStore();
      populateBooks();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const searchQuery = e.target.value.toLowerCase();
          if (!searchQuery) {
            showBooks();
            populateBooks();
          } else {
            sortBooks();
          }
        });
      } else {
        console.warn('Search input not found');
      }
    });

    // Keyboard Accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('active');
      }
    });
  