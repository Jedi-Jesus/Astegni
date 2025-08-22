// Year Selection
function selectYear(year) {
    // Remove active class from all year buttons
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected year button
    const selectedBtn = Array.from(document.querySelectorAll('.year-btn')).find(btn => {
        const btnText = btn.querySelector('.year-label').textContent;
        return btnText.includes(year) || (year === 'current' && btnText.includes('Current'));
    });
    
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Hide all year views
    document.querySelectorAll('.year-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected year view
    let viewId;
    if (year === 'current') {
        viewId = 'current-classes-view';
    } else {
        viewId = `year-${year}-view`;
    }
    
    const selectedView = document.getElementById(viewId);
    if (selectedView) {
        selectedView.classList.add('active');
        
        // Animate cards on display
        const cards = selectedView.querySelectorAll('.my-class-card, .alumni-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s forwards`;
            setTimeout(() => {
                card.style.opacity = '1';
            }, index * 100);
        });
    }
    
    // If year doesn't have a view yet, create placeholder content
    if (!selectedView && year !== 'current') {
        createYearPlaceholder(year);
    }
}

// Create placeholder content for years without specific content
function createYearPlaceholder(year) {
    const mainContent = document.querySelector('.classes-main-content');
    
    // Hide all views
    document.querySelectorAll('.year-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Create new view if it doesn't exist
    let yearView = document.getElementById(`year-${year}-view`);
    if (!yearView) {
        yearView = document.createElement('div');
        yearView.id = `year-${year}-view`;
        yearView.className = 'year-view active';
        
        // Generate random but realistic data for the year
        const classCount = Math.floor(Math.random() * 10) + 18;
        const studentCount = Math.floor(Math.random() * 200) + 700;
        const alumniCount = Math.floor(Math.random() * 50) + (studentCount - 100);
        const rating = (Math.random() * 0.5 + 4.3).toFixed(1);
        
        yearView.innerHTML = `
            <div class="year-overview">
                <div class="overview-card">
                    <span class="overview-icon">📚</span>
                    <div class="overview-info">
                        <span class="overview-number">${classCount}</span>
                        <span class="overview-label">Total Classes</span>
                    </div>
                </div>
                <div class="overview-card">
                    <span class="overview-icon">👥</span>
                    <div class="overview-info">
                        <span class="overview-number">${studentCount}</span>
                        <span class="overview-label">Total Students</span>
                    </div>
                </div>
                <div class="overview-card">
                    <span class="overview-icon">🎓</span>
                    <div class="overview-info">
                        <span class="overview-number">${alumniCount}</span>
                        <span class="overview-label">Alumni</span>
                    </div>
                </div>
                <div class="overview-card">
                    <span class="overview-icon">⭐</span>
                    <div class="overview-info">
                        <span class="overview-number">${rating}</span>
                        <span class="overview-label">Avg Rating</span>
                    </div>
                </div>
            </div>
            
            <div class="my-classes-grid">
                ${generateYearClasses(year)}
            </div>
        `;
        
        mainContent.appendChild(yearView);
    } else {
        yearView.classList.add('active');
    }
}

// Generate sample classes for a year
function generateYearClasses(year) {
    const courses = [
        { name: 'Film Production Basics', code: 'FPB-101', instructor: 'Prof. Anderson', image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400' },
        { name: 'Screenwriting Workshop', code: 'SCR-201', instructor: 'Lisa Johnson', image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400' },
        { name: 'Sound Design', code: 'SND-301', instructor: 'Mark Thompson', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400' },
        { name: 'Digital Cinematography', code: 'CIN-202', instructor: 'Sarah Williams', image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400' },
        { name: 'Post-Production Pipeline', code: 'PST-401', instructor: 'David Chen', image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400' }
    ];
    
    const numClasses = Math.min(3, courses.length);
    let classesHTML = '';
    
    for (let i = 0; i < numClasses; i++) {
        const course = courses[i];
        const students = Math.floor(Math.random() * 80) + 20;
        const graduates = Math.floor(students * (0.85 + Math.random() * 0.1));
        const rating = (Math.random() * 0.7 + 4.3).toFixed(1);
        const completion = Math.floor(Math.random() * 15) + 85;
        
        classesHTML += `
            <div class="my-class-card">
                <div class="class-status-badge completed">Completed</div>
                <div class="my-class-header">
                    <img src="${course.image}" alt="${course.name}" class="my-class-image">
                    <div class="class-header-overlay">
                        <span class="class-code">${course.code}</span>
                    </div>
                </div>
                <div class="my-class-body">
                    <h3>${course.name}</h3>
                    <p class="class-instructor">${course.instructor}</p>
                    
                    <div class="class-details-grid">
                        <div class="detail-item">
                            <span class="detail-icon">📅</span>
                            <span>${year}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">👥</span>
                            <span>${students} Students</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">🎓</span>
                            <span>${graduates} Graduates</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">⭐</span>
                            <span>${rating}/5.0 Rating</span>
                        </div>
                    </div>
                    
                    <div class="class-stats-bar">
                        <div class="stat-bar-item">
                            <span>Completion Rate</span>
                            <div class="mini-progress-bar">
                                <div class="mini-progress-fill" style="width: ${completion}%"></div>
                            </div>
                            <span>${completion}%</span>
                        </div>
                    </div>
                    
                    <div class="class-card-actions">
                        <button class="btn-view-details">View Details</button>
                        <button class="btn-download-report">📊 Report</button>
                        <button class="btn-contact-alumni">👥 Alumni</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    return classesHTML;
}

// Alumni Functions
function showAllAlumni() {
    // Hide year views
    document.querySelectorAll('.year-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show alumni view
    const alumniView = document.getElementById('alumni-view');
    if (alumniView) {
        alumniView.classList.add('active');
    }
    
    // Remove active from year buttons
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    showNotification('Loading all alumni...', 'info');
}

function showAlumniByYear() {
    showAllAlumni();
    showNotification('Organizing alumni by graduation year...', 'info');
}

function showAlumniByIndustry() {
    showAllAlumni();
    showNotification('Organizing alumni by industry...', 'info');
}

function showAlumniAchievements() {
    showAllAlumni();
    showNotification('Loading alumni achievements...', 'info');
}

// Export All Data
function exportAllData() {
    const allData = {
        summary: {
            totalYears: 5,
            totalClasses: 112,
            totalStudents: 4285,
            totalAlumni: 3458,
            averageRating: 4.7,
            employmentRate: 89
        },
        years: {
            2024: {
                classes: 24,
                students: 856,
                alumni: 742,
                rating: 4.8
            },
            2023: {
                classes: 28,
                students: 945,
                alumni: 912,
                rating: 4.7
            },
            2022: {
                classes: 22,
                students: 823,
                alumni: 801,
                rating: 4.6
            },
            2021: {
                classes: 18,
                students: 687,
                alumni: 672,
                rating: 4.7
            },
            2020: {
                classes: 15,
                students: 542,
                alumni: 531,
                rating: 4.5
            }
        },
        alumniByIndustry: {
            filmProduction: 892,
            television: 654,
            streamingServices: 723,
            gaming: 423,
            advertising: 342,
            freelance: 424
        }
    };
    
    const jsonData = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_classes_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('All data exported successfully!', 'success');
}

// Generate Full Report
function generateFullReport() {
    showNotification('Generating comprehensive report for all years...', 'info');
    
    setTimeout(() => {
        const reportHTML = `
            <html>
            <head>
                <title>Complete Teaching History Report - Zenith Academy</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
                    h1 { color: #6366f1; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
                    h2 { color: #f59e0b; margin-top: 30px; }
                    .summary-box { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #6366f1; color: white; }
                    .year-section { page-break-before: always; margin-top: 40px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
                    .stat-box { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
                    .stat-number { font-size: 24px; font-weight: bold; color: #6366f1; }
                    .stat-label { color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <h1>Complete Teaching History Report</h1>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
                
                <div class="summary-box">
                    <h2>Executive Summary (2020-2024)</h2>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-number">112</div>
                            <div class="stat-label">Total Classes</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">4,285</div>
                            <div class="stat-label">Total Students</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">3,458</div>
                            <div class="stat-label">Alumni Network</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">89%</div>
                            <div class="stat-label">Employment Rate</div>
                        </div>
                    </div>
                </div>
                
                <h2>Year-by-Year Breakdown</h2>
                <table>
                    <tr>
                        <th>Year</th>
                        <th>Classes</th>
                        <th>Students</th>
                        <th>Graduates</th>
                        <th>Avg Rating</th>
                        <th>Employment Rate</th>
                    </tr>
                    <tr>
                        <td>2024</td>
                        <td>24</td>
                        <td>856</td>
                        <td>742</td>
                        <td>4.8/5.0</td>
                        <td>89%</td>
                    </tr>
                    <tr>
                        <td>2023</td>
                        <td>28</td>
                        <td>945</td>
                        <td>912</td>
                        <td>4.7/5.0</td>
                        <td>87%</td>
                    </tr>
                    <tr>
                        <td>2022</td>
                        <td>22</td>
                        <td>823</td>
                        <td>801</td>
                        <td>4.6/5.0</td>
                        <td>85%</td>
                    </tr>
                    <tr>
                        <td>2021</td>
                        <td>18</td>
                        <td>687</td>
                        <td>672</td>
                        <td>4.7/5.0</td>
                        <td>88%</td>
                    </tr>
                    <tr>
                        <td>2020</td>
                        <td>15</td>
                        <td>542</td>
                        <td>531</td>
                        <td>4.5/5.0</td>
                        <td>86%</td>
                    </tr>
                </table>
                
                <h2>Alumni Industry Distribution</h2>
                <table>
                    <tr>
                        <th>Industry</th>
                        <th>Number of Alumni</th>
                        <th>Percentage</th>
                    </tr>
                    <tr>
                        <td>Film Production</td>
                        <td>892</td>
                        <td>25.8%</td>
                    </tr>
                    <tr>
                        <td>Streaming Services</td>
                        <td>723</td>
                        <td>20.9%</td>
                    </tr>
                    <tr>
                        <td>Television</td>
                        <td>654</td>
                        <td>18.9%</td>
                    </tr>
                    <tr>
                        <td>Gaming Industry</td>
                        <td>423</td>
                        <td>12.2%</td>
                    </tr>
                    <tr>
                        <td>Freelance</td>
                        <td>424</td>
                        <td>12.3%</td>
                    </tr>
                    <tr>
                        <td>Advertising</td>
                        <td>342</td>
                        <td>9.9%</td>
                    </tr>
                </table>
                
                <h2>Notable Achievements</h2>
                <ul>
                    <li>15 Emmy Award winners among alumni</li>
                    <li>8 Academy Award nominations</li>
                    <li>42 alumni working at major studios (Netflix, HBO, Disney+)</li>
                    <li>23 alumni founded their own production companies</li>
                    <li>Average salary increase of 45% within 2 years of graduation</li>
                </ul>
                
                <h2>Top Performing Classes (All Time)</h2>
                <ol>
                    <li>Film Directing Masterclass - 5.0/5.0 rating (2024)</li>
                    <li>Advanced Cinematography - 4.9/5.0 rating (2024)</li>
                    <li>Digital Photography - 4.9/5.0 rating (2024)</li>
                    <li>3D Animation & VFX - 4.8/5.0 rating (2024)</li>
                    <li>Documentary Filmmaking - 4.8/5.0 rating (2023)</li>
                </ol>
                
                <p style="margin-top: 40px; text-align: center; color: #666;">
                    © ${new Date().getFullYear()} Zenith Academy - Complete Teaching History Report
                </p>
            </body>
            </html>
        `;
        
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'complete_teaching_report.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Complete report generated successfully!', 'success');
    }, 2000);
}

// Print View
function printView() {
    window.print();
    showNotification('Opening print dialog...', 'info');
}

// Initialize My Classes Modal with proper year
function openMyClassesModal() {
    const modal = document.getElementById('myClassesModal');
    modal.classList.add('show');
    // Initialize with 2024 as default
    selectYear(2024);
}// Training Center JavaScript

// Theme Management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme toggle button
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
    
    // Initialize all components
    initializeCalendar();
    initializeCharts();
    initializeUploadZone();
    initializeAttendance();
    initializeGroups();
    initializeConnections();
    initializeNotifications();
    initializeSearch();
    initializeFAB();
});

// Modal Management
function openClassModal() {
    const modal = document.getElementById('classModal');
    modal.classList.add('show');
}

function closeClassModal() {
    const modal = document.getElementById('classModal');
    modal.classList.remove('show');
}

function openJobModal() {
    const modal = document.getElementById('jobModal');
    modal.classList.add('show');
}

function closeJobModal() {
    const modal = document.getElementById('jobModal');
    modal.classList.remove('show');
}

function startClass() {
    const modal = document.getElementById('startClassModal');
    modal.classList.add('show');
}

function closeStartClassModal() {
    const modal = document.getElementById('startClassModal');
    modal.classList.remove('show');
}

function openMyClassesModal() {
    const modal = document.getElementById('myClassesModal');
    modal.classList.add('show');
    // Initialize with Spring semester
    showSemester('spring');
}

function closeMyClassesModal() {
    const modal = document.getElementById('myClassesModal');
    modal.classList.remove('show');
}

function viewClassDetails() {
    // Simulate viewing class details
    alert('Opening class details view...');
}

// Semester Tab Management
function showSemester(semester) {
    // Hide all semester contents
    const allContents = document.querySelectorAll('.semester-content');
    allContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active from all tabs
    const allTabs = document.querySelectorAll('.semester-tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected semester
    const selectedContent = document.getElementById(`${semester}-semester`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Activate selected tab
    const selectedTab = Array.from(allTabs).find(tab => 
        tab.textContent.toLowerCase().includes(semester)
    );
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Animate class cards on display
    setTimeout(() => {
        const cards = selectedContent?.querySelectorAll('.my-class-card');
        cards?.forEach((card, index) => {
            card.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s forwards`;
            card.style.opacity = '0';
            setTimeout(() => {
                card.style.opacity = '1';
            }, index * 100);
        });
    }, 100);
}

// Export Class Data
function exportClassData() {
    const data = {
        year: 2024,
        totalClasses: 24,
        totalStudents: 856,
        alumni: 742,
        avgRating: 4.8,
        semesters: {
            spring: {
                classes: [
                    {
                        name: "Advanced Cinematography",
                        code: "CIN-301",
                        instructor: "Prof. David Martinez",
                        students: 45,
                        graduates: 42,
                        rating: 4.9,
                        completionRate: 93
                    },
                    {
                        name: "Professional Video Editing",
                        code: "EDT-205",
                        instructor: "Sarah Thompson",
                        students: 120,
                        graduates: 115,
                        rating: 4.7,
                        completionRate: 96
                    },
                    {
                        name: "Film Directing Masterclass",
                        code: "DIR-401",
                        instructor: "Prof. Michael Chen",
                        students: 32,
                        graduates: 30,
                        rating: 5.0,
                        completionRate: 94
                    }
                ]
            },
            summer: {
                classes: [
                    {
                        name: "3D Animation & VFX",
                        code: "ANI-302",
                        instructor: "Jennifer Park",
                        students: 58,
                        graduates: 55,
                        rating: 4.8,
                        completionRate: 95
                    }
                ]
            },
            fall: {
                classes: [
                    {
                        name: "Digital Photography",
                        code: "PHO-201",
                        instructor: "Robert Williams",
                        students: 75,
                        status: "In Progress",
                        rating: 4.9,
                        progress: 75
                    }
                ]
            }
        }
    };
    
    // Convert to JSON and create download
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class_data_2024.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Class data exported successfully!', 'success');
}

// Generate Year Report
function generateYearReport() {
    showNotification('Generating comprehensive year report...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        const reportHTML = `
            <html>
            <head>
                <title>2024 Annual Teaching Report - Zenith Academy</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #F59E0B; }
                    h2 { color: #667eea; margin-top: 30px; }
                    .stat { margin: 10px 0; }
                    .stat-label { font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #f5f5f5; }
                </style>
            </head>
            <body>
                <h1>2024 Annual Teaching Report</h1>
                <h2>Executive Summary</h2>
                <div class="stat"><span class="stat-label">Total Classes:</span> 24</div>
                <div class="stat"><span class="stat-label">Total Students:</span> 856</div>
                <div class="stat"><span class="stat-label">Alumni:</span> 742</div>
                <div class="stat"><span class="stat-label">Average Rating:</span> 4.8/5.0</div>
                <div class="stat"><span class="stat-label">Employment Rate:</span> 89%</div>
                
                <h2>Spring Semester 2024</h2>
                <table>
                    <tr>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Students</th>
                        <th>Graduates</th>
                        <th>Rating</th>
                    </tr>
                    <tr>
                        <td>Advanced Cinematography (CIN-301)</td>
                        <td>Prof. David Martinez</td>
                        <td>45</td>
                        <td>42</td>
                        <td>4.9/5.0</td>
                    </tr>
                    <tr>
                        <td>Professional Video Editing (EDT-205)</td>
                        <td>Sarah Thompson</td>
                        <td>120</td>
                        <td>115</td>
                        <td>4.7/5.0</td>
                    </tr>
                    <tr>
                        <td>Film Directing Masterclass (DIR-401)</td>
                        <td>Prof. Michael Chen</td>
                        <td>32</td>
                        <td>30</td>
                        <td>5.0/5.0</td>
                    </tr>
                </table>
                
                <h2>Key Achievements</h2>
                <ul>
                    <li>96% average completion rate across all courses</li>
                    <li>89% of alumni secured industry positions within 3 months</li>
                    <li>4.8/5.0 average student satisfaction rating</li>
                    <li>Introduced 5 new industry-standard courses</li>
                    <li>Partnership with 12 major production studios</li>
                </ul>
                
                <h2>Notable Alumni Placements</h2>
                <ul>
                    <li>Sarah Chen - Video Editor at Netflix</li>
                    <li>Mike Johnson - Freelance Director of Photography</li>
                    <li>Lisa Wang - Post-Production Supervisor at HBO</li>
                    <li>Tom Anderson - Senior Editor at Sony Pictures</li>
                    <li>Emma Davis - VFX Artist at Warner Bros</li>
                </ul>
                
                <p style="margin-top: 40px; text-align: center; color: #666;">
                    Generated on ${new Date().toLocaleDateString()}
                </p>
            </body>
            </html>
        `;
        
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annual_report_2024.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Annual report generated successfully!', 'success');
    }, 2000);
}

// View detailed class information
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-view-details')) {
        const card = e.target.closest('.my-class-card');
        const className = card.querySelector('h3').textContent;
        showNotification(`Opening detailed view for ${className}...`, 'info');
    }
    
    if (e.target.classList.contains('btn-download-report')) {
        const card = e.target.closest('.my-class-card');
        const className = card.querySelector('h3').textContent;
        showNotification(`Downloading report for ${className}...`, 'info');
    }
    
    if (e.target.classList.contains('btn-contact-alumni')) {
        const card = e.target.closest('.my-class-card');
        const className = card.querySelector('h3').textContent;
        showNotification(`Opening alumni network for ${className}...`, 'info');
    }
});

// Add hover effect for alumni avatars to show tooltips
document.querySelectorAll('.alumni-avatars img').forEach(img => {
    img.addEventListener('mouseenter', function(e) {
        const tooltip = document.createElement('div');
        tooltip.className = 'alumni-tooltip';
        tooltip.textContent = this.getAttribute('title') || 'Alumni';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 0.5rem;
            border-radius: 6px;
            font-size: 0.85rem;
            z-index: 1000;
            pointer-events: none;
            white-space: nowrap;
        `;
        document.body.appendChild(tooltip);
        
        const rect = this.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - 40) + 'px';
        
        this.addEventListener('mouseleave', function() {
            tooltip.remove();
        }, { once: true });
    });
});

// Calendar Widget
function initializeCalendar() {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Add day headers
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.style.fontWeight = '600';
        dayHeader.style.fontSize = '0.8rem';
        dayHeader.style.textAlign = 'center';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.style.textAlign = 'center';
        dayCell.style.padding = '0.5rem';
        dayCell.style.borderRadius = '8px';
        dayCell.style.cursor = 'pointer';
        dayCell.textContent = day;
        
        // Highlight today
        if (day === today.getDate()) {
            dayCell.style.background = 'var(--primary-gradient)';
            dayCell.style.color = 'white';
            dayCell.style.fontWeight = '600';
        }
        
        // Add hover effect
        dayCell.addEventListener('mouseenter', function() {
            if (day !== today.getDate()) {
                this.style.background = 'rgba(0, 0, 0, 0.05)';
            }
        });
        
        dayCell.addEventListener('mouseleave', function() {
            if (day !== today.getDate()) {
                this.style.background = 'transparent';
            }
        });
        
        // Add random events to some days
        if (Math.random() > 0.7) {
            const eventDot = document.createElement('div');
            eventDot.style.width = '4px';
            eventDot.style.height = '4px';
            eventDot.style.background = '#f59e0b';
            eventDot.style.borderRadius = '50%';
            eventDot.style.margin = '2px auto 0';
            dayCell.appendChild(eventDot);
        }
        
        calendarGrid.appendChild(dayCell);
    }
}

// Charts Initialization
function initializeCharts() {
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 200;
    
    // Simple line chart
    const data = [30, 45, 35, 50, 65, 75, 60, 80, 90, 85, 95, 100];
    const maxValue = Math.max(...data);
    const points = data.map((value, index) => ({
        x: (width / (data.length - 1)) * index,
        y: height - (value / maxValue) * height * 0.8 - 20
    }));
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke();
    
    // Draw points
    points.forEach(point => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// File Upload
function initializeUploadZone() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadZone || !fileInput) return;
    
    // Click to upload
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function handleFiles(files) {
    const mediaGrid = document.querySelector('.media-grid');
    
    Array.from(files).forEach(file => {
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        const fileType = file.type.split('/')[0];
        let icon = '📄';
        
        if (fileType === 'video') icon = '🎬';
        else if (fileType === 'audio') icon = '🎵';
        else if (file.type.includes('pdf')) icon = '📄';
        else if (fileType === 'image') icon = '🖼️';
        
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        mediaItem.innerHTML = `
            <div class="media-thumbnail">${icon}</div>
            <span>${file.name}</span>
            <span class="media-size">${fileSize} MB</span>
        `;
        
        mediaGrid.appendChild(mediaItem);
        
        // Show success notification
        showNotification(`File "${file.name}" uploaded successfully!`, 'success');
    });
}

// Attendance System
function initializeAttendance() {
    const attendanceCards = document.querySelectorAll('.attendance-card');
    
    attendanceCards.forEach(card => {
        card.addEventListener('click', function() {
            const statusElement = this.querySelector('.attendance-status');
            const isPresent = statusElement.classList.contains('present');
            
            if (isPresent) {
                statusElement.classList.remove('present');
                statusElement.classList.add('absent');
                statusElement.textContent = 'Absent';
            } else {
                statusElement.classList.remove('absent');
                statusElement.classList.add('present');
                statusElement.textContent = 'Present';
            }
            
            // Update attendance percentage
            updateAttendanceStats();
        });
    });
}

function updateAttendanceStats() {
    // Simulate updating attendance statistics
    const attendanceCards = document.querySelectorAll('.attendance-card');
    let presentCount = 0;
    
    attendanceCards.forEach(card => {
        if (card.querySelector('.attendance-status.present')) {
            presentCount++;
        }
    });
    
    const percentage = Math.round((presentCount / attendanceCards.length) * 100);
    console.log(`Attendance: ${percentage}%`);
}

// Groups Management
function initializeGroups() {
    const groupCards = document.querySelectorAll('.group-card button');
    
    groupCards.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('btn-primary')) {
                this.classList.remove('btn-primary');
                this.classList.add('btn-secondary');
                this.textContent = 'Joined ✓';
                
                // Update member count
                const memberCount = this.closest('.group-card').querySelector('.member-count');
                const currentCount = parseInt(memberCount.textContent);
                memberCount.textContent = `${currentCount + 1} members`;
                
                showNotification('Successfully joined the group!', 'success');
            } else {
                this.classList.remove('btn-secondary');
                this.classList.add('btn-primary');
                this.textContent = 'Join Group';
                
                // Update member count
                const memberCount = this.closest('.group-card').querySelector('.member-count');
                const currentCount = parseInt(memberCount.textContent);
                memberCount.textContent = `${currentCount - 1} members`;
                
                showNotification('You left the group', 'info');
            }
        });
    });
}

// Connections
function initializeConnections() {
    const connectButtons = document.querySelectorAll('.btn-connect');
    
    connectButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent === 'Connect') {
                this.textContent = 'Pending';
                this.style.background = 'rgba(0, 0, 0, 0.1)';
                this.style.color = 'var(--text)';
                showNotification('Connection request sent!', 'success');
            } else {
                this.textContent = 'Connect';
                this.style.background = 'var(--primary-gradient)';
                this.style.color = 'white';
                showNotification('Connection request cancelled', 'info');
            }
        });
    });
    
    const messageButtons = document.querySelectorAll('.btn-message');
    messageButtons.forEach(button => {
        button.addEventListener('click', function() {
            showNotification('Opening message composer...', 'info');
        });
    });
}

// Notifications
function initializeNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            showNotification('You have 5 new notifications', 'info');
        });
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 300px;
    `;
    
    // Add icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    notification.innerHTML = `
        <span style="font-size: 1.5rem">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Search Functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            
            // Filter connections
            const connectionCards = document.querySelectorAll('.connection-card');
            connectionCards.forEach(card => {
                const name = card.querySelector('h4').textContent.toLowerCase();
                const role = card.querySelector('.connection-role').textContent.toLowerCase();
                const bio = card.querySelector('.connection-bio').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || role.includes(searchTerm) || bio.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

// Floating Action Button
function initializeFAB() {
    const fab = document.querySelector('.fab');
    if (fab) {
        fab.addEventListener('click', function() {
            this.style.transform = this.style.transform === 'rotate(45deg)' ? 'rotate(0deg)' : 'rotate(45deg)';
        });
    }
}

// Form Submissions
document.getElementById('classForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    showNotification('Class created successfully!', 'success');
    closeClassModal();
    this.reset();
});

document.getElementById('jobForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    showNotification('Job posted successfully!', 'success');
    closeJobModal();
    this.reset();
});

// Filter Functionality
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        // Remove active from all chips
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        // Add active to clicked chip
        this.classList.add('active');
        
        const filter = this.textContent.toLowerCase();
        const classCards = document.querySelectorAll('.class-card');
        
        classCards.forEach(card => {
            if (filter === 'all classes') {
                card.style.display = 'block';
            } else {
                const category = card.querySelector('.class-category').textContent.toLowerCase();
                card.style.display = category.includes(filter) ? 'block' : 'none';
            }
        });
    });
});

// Community Tabs
document.querySelectorAll('.community-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.community-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Simulate loading different content
        const tabName = this.textContent;
        showNotification(`Loading ${tabName}...`, 'info');
    });
});

// Media Tabs
document.querySelectorAll('.media-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Filter media items
        const mediaType = this.textContent.toLowerCase();
        const mediaItems = document.querySelectorAll('.media-item');
        
        mediaItems.forEach(item => {
            const icon = item.querySelector('.media-thumbnail').textContent;
            let shouldShow = false;
            
            if (mediaType === 'videos' && icon === '🎬') shouldShow = true;
            else if (mediaType === 'audio' && icon === '🎵') shouldShow = true;
            else if (mediaType === 'documents' && icon === '📄') shouldShow = true;
            
            item.style.display = shouldShow ? 'block' : 'none';
        });
    });
});

// Live Session Simulation
let liveSessionInterval;

function startLiveSession() {
    const liveIndicators = document.querySelectorAll('.live-indicator');
    liveIndicators.forEach(indicator => {
        liveSessionInterval = setInterval(() => {
            indicator.style.opacity = indicator.style.opacity === '1' ? '0.5' : '1';
        }, 1000);
    });
}

function stopLiveSession() {
    clearInterval(liveSessionInterval);
}

// Initialize live sessions on load
startLiveSession();

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search-input')?.focus();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }
});

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Auto-save functionality for forms
let autoSaveTimer;

function autoSave() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        localStorage.setItem(`form_${form.id}`, JSON.stringify(data));
    });
}

document.querySelectorAll('form input, form textarea, form select').forEach(input => {
    input.addEventListener('input', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(autoSave, 1000);
    });
});

// Restore form data on load
window.addEventListener('load', () => {
    document.querySelectorAll('form').forEach(form => {
        const savedData = localStorage.getItem(`form_${form.id}`);
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = data[key];
            });
        }
    });
});

// Progress Animation
function animateProgress() {
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.width = width;
        }, 100);
    });
}

// Animate on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            if (entry.target.querySelector('.progress-fill')) {
                animateProgress();
            }
        }
    });
});

document.querySelectorAll('.stat-card, .widget-card, .class-card, .job-card').forEach(card => {
    observer.observe(card);
});

console.log('Training Center Platform Initialized Successfully!');