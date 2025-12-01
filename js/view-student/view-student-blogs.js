/**
 * View Student Blogs Manager
 * Dynamically loads and displays blog posts from the blogs database table
 */

// Category colors mapping
const CATEGORY_COLORS = {
    'tutorial': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
    'education': { gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.05)' },
    'technology': { gradient: 'linear-gradient(135deg, #667eea, #764ba2)', border: '#667eea', bg: 'rgba(102, 126, 234, 0.05)' },
    'science': { gradient: 'linear-gradient(135deg, #10b981, #059669)', border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' },
    'lifestyle': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
    'skills': { gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)' },
    'personal': { gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '#22c55e', bg: 'rgba(34, 197, 94, 0.05)' },
    'default': { gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', border: '#6b7280', bg: 'rgba(107, 114, 128, 0.05)' }
};

/**
 * Fetch student blogs from API
 */
async function fetchStudentBlogs(studentUserId) {
    try {
        // Fetch blogs for this specific student profile
        const response = await fetch(`${API_BASE_URL}/api/blogs?role=student&limit=50`);

        if (!response.ok) {
            throw new Error('Failed to fetch blogs');
        }

        const allBlogs = await response.json();

        // Filter to only show blogs from this specific student profile
        const studentBlogs = allBlogs.filter(blog => blog.profile_id === studentUserId);

        return studentBlogs;
    } catch (error) {
        console.error('Error fetching student blogs:', error);
        return [];
    }
}

/**
 * Format date to readable string
 */
function formatBlogDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Calculate reading stats (mock data for now)
 */
function calculateReadingStats(blog) {
    // In a real implementation, these would come from the database
    // For now, we'll use likes and comments count with some calculation
    const views = blog.likes * 5 + Math.floor(Math.random() * 100);
    const commentCount = Array.isArray(blog.comments) ? blog.comments.length : 0;

    return {
        views,
        commentCount
    };
}

/**
 * Get default blog image based on blog ID
 */
function getDefaultBlogImage(blogId) {
    // Generate a letter from A-Z based on blog ID
    const letter = String.fromCharCode(65 + (blogId % 26)); // A=65 in ASCII
    const number = (blogId % 9) + 1; // Numbers 1-9

    // Create a gradient based on category colors
    const gradients = [
        'linear-gradient(135deg, #f59e0b, #d97706)', // Orange
        'linear-gradient(135deg, #8b5cf6, #7c3aed)', // Purple
        'linear-gradient(135deg, #10b981, #059669)', // Green
        'linear-gradient(135deg, #3b82f6, #2563eb)', // Blue
        'linear-gradient(135deg, #ef4444, #dc2626)', // Red
        'linear-gradient(135deg, #ec4899, #db2777)', // Pink
        'linear-gradient(135deg, #14b8a6, #0d9488)', // Teal
        'linear-gradient(135deg, #f97316, #ea580c)', // Orange-red
        'linear-gradient(135deg, #a855f7, #9333ea)'  // Purple-pink
    ];

    const gradient = gradients[blogId % gradients.length];

    return {
        gradient: gradient,
        text: `${letter}${number}`
    };
}

/**
 * Render a single blog post (card style matching achievement cards)
 */
function renderBlogPost(blog) {
    const colors = CATEGORY_COLORS[blog.category.toLowerCase()] || CATEGORY_COLORS['default'];
    const formattedDate = formatBlogDate(blog.created_at);
    const stats = calculateReadingStats(blog);

    // Truncate description to 150 characters
    const description = blog.description && blog.description.length > 150
        ? blog.description.substring(0, 150) + '...'
        : (blog.description || 'Click to read the full article...');

    // Get image or default placeholder
    let blogImageHtml;
    if (blog.blog_picture) {
        blogImageHtml = `<img src="${blog.blog_picture}" alt="${blog.title}"
            style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px 12px 0 0;"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display: none; width: 100%; height: 200px; background: ${getDefaultBlogImage(blog.id).gradient}; border-radius: 12px 12px 0 0; align-items: center; justify-content: center;">
                <span style="font-size: 4rem; font-weight: 800; color: white; text-shadow: 0 4px 12px rgba(0,0,0,0.3);">${getDefaultBlogImage(blog.id).text}</span>
            </div>`;
    } else {
        const defaultImg = getDefaultBlogImage(blog.id);
        blogImageHtml = `<div style="width: 100%; height: 200px; background: ${defaultImg.gradient}; border-radius: 12px 12px 0 0; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 4rem; font-weight: 800; color: white; text-shadow: 0 4px 12px rgba(0,0,0,0.3);">${defaultImg.text}</span>
            </div>`;
    }

    return `
        <div style="background: var(--card-bg); border-radius: 12px; overflow: hidden; transition: all 0.3s; box-shadow: var(--shadow-sm); border: 2px solid ${colors.border};"
            onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-lg)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)'">

            <!-- Blog Image or Default Placeholder -->
            ${blogImageHtml}

            <!-- Blog Content -->
            <div style="padding: 1.5rem;">
                <!-- Title -->
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--heading); margin-bottom: 0.75rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${blog.title}
                </h3>

                <!-- Category Badge and Date -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                    <span style="background: ${colors.gradient}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${blog.category}
                    </span>
                    <span style="background: var(--border-color); color: var(--text-secondary); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                        📅 ${formattedDate}
                    </span>
                </div>

                <!-- Description -->
                <p style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${description}
                </p>

                <!-- Meta Stats -->
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--border-color); font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.375rem;">
                        <span>📖</span>
                        <span>${blog.reading_time} min</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.375rem;">
                        <span>💬</span>
                        <span>${stats.commentCount}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.375rem;">
                        <span>❤️</span>
                        <span>${blog.likes}</span>
                    </div>
                </div>

                <!-- Read Button (Separate Section) -->
                <button onclick="event.stopPropagation(); readBlogPost(${blog.id})"
                    style="width: 100%; background: linear-gradient(135deg, var(--primary-color), #2563eb); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                    Read Article
                    <span style="font-size: 0.875rem;">→</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Load and render student blogs
 */
async function loadStudentBlogs(studentUserId) {
    const container = document.getElementById('student-blogs-container');
    if (!container) return;

    try {
        console.log('Loading blogs for student user ID:', studentUserId);

        const blogs = await fetchStudentBlogs(studentUserId);

        if (blogs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem;">
                    <i class="fas fa-blog" style="font-size: 4rem; color: var(--text-secondary); opacity: 0.3; margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.5rem; color: var(--heading); margin-bottom: 0.5rem;">No Blog Posts Yet</h3>
                    <p style="color: var(--text-secondary);">This student hasn't written any blog posts yet.</p>
                </div>
            `;
            return;
        }

        // Render blogs in a grid layout
        const blogsHTML = blogs.map(blog => renderBlogPost(blog)).join('');
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                ${blogsHTML}
            </div>
        `;

        console.log(`Loaded ${blogs.length} blog post(s) for student ${studentUserId}`);

    } catch (error) {
        console.error('Error loading student blogs:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <h3 style="font-size: 1.5rem; color: var(--heading); margin-bottom: 0.5rem;">Error Loading Blogs</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">${error.message}</p>
                <button onclick="loadStudentBlogs(${studentUserId})"
                    style="padding: 0.75rem 2rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Try Again
                </button>
            </div>
        `;
    }
}

/**
 * Read blog post (navigate to blog detail page)
 */
function readBlogPost(blogId) {
    console.log('Reading blog post:', blogId);
    // TODO: Navigate to blog detail page when implemented
    // For now, show alert
    alert(`Blog post ${blogId} clicked! Blog detail page will be created next.`);
    // Future: window.location.href = `/blog-detail.html?id=${blogId}`;
}

// Make functions globally available
window.loadStudentBlogs = loadStudentBlogs;
window.readBlogPost = readBlogPost;
