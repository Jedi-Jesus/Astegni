-- Create the users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    register_as VARCHAR(20) NOT NULL CHECK (register_as IN ('tutor', 'student', 'parent', 'superAdmin', 'admin', 'institute', 'store', 'delivery', 'advertiser', 'employer')),
    gender VARCHAR(20),
    guardian_type VARCHAR(20),
    institute_type VARCHAR(50),
    social_platform VARCHAR(50),
    social_address VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL OR social_address IS NOT NULL)
);

-- Create table for system cover photo and profile picture
CREATE TABLE systemUserImages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    cover_photo VARCHAR(255),
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for rotating background images
CREATE TABLE rotationCarousel (
    id SERIAL PRIMARY KEY,
    image_path VARCHAR(255) NOT NULL,
    alt_text VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for ad images (990x440 or 300x250)
CREATE TABLE adImages (
    id SERIAL PRIMARY KEY,
    image_path VARCHAR(255) NOT NULL,
    size VARCHAR(20) NOT NULL CHECK (size IN ('990x440', '300x250')),
    alt_text VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for share images (one for man, one for woman)
CREATE TABLE shareImage (
    id SERIAL PRIMARY KEY,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('man', 'woman')),
    image_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for notes background images
CREATE TABLE notesBackground (
    id SERIAL PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for add to cart icons
CREATE TABLE addToCartIcon (
    id SERIAL PRIMARY KEY,
    icon_type VARCHAR(50) NOT NULL,
    icon_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for news uploads
CREATE TABLE uploadNews (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    image_path VARCHAR(255),
    video_path VARCHAR(255),
    thumbnail_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for video uploads (renamed from ExploreAstegniVideos)
CREATE TABLE uploadVideo (
    id SERIAL PRIMARY KEY,
    video_path VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for tutor profiles
CREATE TABLE tutorTable (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cover_picture VARCHAR(255),
    profile_picture VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female')),
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    teaches_at VARCHAR(255),
    courses TEXT,
    tutoring_method VARCHAR(100),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    id_scanned VARCHAR(255),
    face_cam VARCHAR(255),
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for tutor certifications
CREATE TABLE tutorCertifications (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutorTable(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    certified_in VARCHAR(100) NOT NULL,
    certification_type VARCHAR(50),
    date DATE,
    certificate VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for tutor experience
CREATE TABLE tutorExperience (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutorTable(id) ON DELETE CASCADE,
    company VARCHAR(100) NOT NULL,
    company_contact VARCHAR(255),
    experienced_in VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    proof VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for tutor verification status
CREATE TABLE getVerified (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER UNIQUE REFERENCES tutorTable(id) ON DELETE CASCADE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for payment details
CREATE TABLE paymentDetails (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('receiving', 'paying')),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for course packages
CREATE TABLE setPackage (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutorTable(id) ON DELETE CASCADE,
    course_name VARCHAR(100) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    discount_three_month DECIMAL(5,2),
    discount_six_month DECIMAL(5,2),
    discount_year DECIMAL(5,2),
    payment_frequency VARCHAR(20) NOT NULL CHECK (payment_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for viewing course packages
CREATE TABLE viewPackage (
    id SERIAL PRIMARY KEY,
    set_package_id INTEGER REFERENCES setPackage(id) ON DELETE CASCADE,
    course VARCHAR(100) NOT NULL,
    days_per_week INTEGER NOT NULL,
    hours_per_week INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for student profiles
CREATE TABLE studentProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    school VARCHAR(100),
    class VARCHAR(50),
    bio TEXT,
    quote TEXT,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for parent profiles
CREATE TABLE parentProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for registering children
CREATE TABLE registerChild (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parentProfile(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for advertiser profiles
CREATE TABLE advertiserProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for advertising campaigns
CREATE TABLE campaign (
    id SERIAL PRIMARY KEY,
    advertiser_id INTEGER REFERENCES advertiserProfile(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    video VARCHAR(255),
    thumbnail VARCHAR(255),
    duration INTERVAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for bookstore profiles
CREATE TABLE bookStoreProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for book uploads
CREATE TABLE uploadBooks (
    id SERIAL PRIMARY KEY,
    bookstore_id INTEGER REFERENCES bookStoreProfile(id) ON DELETE CASCADE,
    cover_photo VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    description TEXT,
    genre VARCHAR(50),
    published_year INTEGER,
    age_restrictions VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    upload_book VARCHAR(255),
    is_ebook BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for game store profiles
CREATE TABLE gameStoreProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for game uploads
CREATE TABLE uploadGame (
    id SERIAL PRIMARY KEY,
    gamestore_id INTEGER REFERENCES gameStoreProfile(id) ON DELETE CASCADE,
    cover_photo VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    description TEXT,
    genre VARCHAR(50),
    published_year INTEGER,
    age_restrictions VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    upload_game VARCHAR(255),
    is_egame BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for store profiles
CREATE TABLE store (
    id SERIAL PRIMARY KEY,
    store_type VARCHAR(50) NOT NULL,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for admin profiles
CREATE TABLE adminProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for superAdmin profiles
CREATE TABLE superAdminProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for institute profiles
CREATE TABLE instituteProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for delivery profiles
CREATE TABLE deliveryProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for employer profiles
CREATE TABLE employerProfile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    location VARCHAR(255),
    bio TEXT,
    quote TEXT,
    socials JSONB,
    comments TEXT,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for notes (accessible to all users)
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tutor_name VARCHAR(100),
    course VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    bg_image_id INTEGER REFERENCES notesBackground(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for following relationships
CREATE TABLE following (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    followed_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, followed_id)
);

-- Create table for wishlist
CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('book', 'game', 'course')),
    item_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_type, item_id)
);

-- Create table for favorites
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    favorite_type VARCHAR(50) NOT NULL CHECK (favorite_type IN ('tutor', 'bookstore', 'gamestore', 'advertiser', 'store', 'institute', 'delivery', 'employer')),
    favorite_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, favorite_type, favorite_id)
);

-- Create table for saved items
CREATE TABLE savedItems (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('note', 'video', 'news')),
    item_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_type, item_id)
);

-- Create table for user products
CREATE TABLE myProducts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('book', 'game')),
    product_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_type, product_id)
);

-- Create table for user requests
CREATE TABLE myRequests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('course', 'book', 'game', 'tutor')),
    request_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for comments
CREATE TABLE commentRate (
    id SERIAL PRIMARY KEY,
    commenter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    commented_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for ratings
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    rater_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ratee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ratee_type VARCHAR(20) NOT NULL CHECK (ratee_type IN ('tutor', 'student', 'parent', 'superAdmin', 'admin', 'institute', 'store', 'delivery', 'advertiser', 'employer')),
    retention INTEGER CHECK (retention IS NULL OR (retention >= 1 AND retention <= 5)),
    discipline INTEGER CHECK (discipline IS NULL OR (discipline >= 1 AND discipline <= 5)),
    punctuality INTEGER CHECK (punctuality IS NULL OR (punctuality >= 1 AND punctuality <= 5)),
    subject_matter INTEGER CHECK (subject_matter IS NULL OR (subject_matter >= 1 AND subject_matter <= 5)),
    communication INTEGER CHECK (communication IS NULL OR (communication >= 1 AND communication <= 5)),
    on_time_payment INTEGER CHECK (on_time_payment IS NULL OR (on_time_payment >= 1 AND on_time_payment <= 5)),
    hospitality INTEGER CHECK (hospitality IS NULL OR (hospitality >= 1 AND hospitality <= 5)),
    delivery_time INTEGER CHECK (delivery_time IS NULL OR (delivery_time >= 1 AND delivery_time <= 5)),
    book_variety INTEGER CHECK (book_variety IS NULL OR (book_variety >= 1 AND book_variety <= 5)),
    course_quality INTEGER CHECK (course_quality IS NULL OR (course_quality >= 1 AND course_quality <= 5)),
    campaign_quality INTEGER CHECK (campaign_quality IS NULL OR (campaign_quality >= 1 AND campaign_quality <= 5)),
    service_giving INTEGER CHECK (service_giving IS NULL OR (service_giving >= 1 AND service_giving <= 5)),
    leadership INTEGER CHECK (leadership IS NULL OR (leadership >= 1 AND leadership <= 5)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rater_id, ratee_id)
);

-- Create table for sharing content
CREATE TABLE share (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('note', 'video', 'news', 'book', 'game', 'course')),
    item_id INTEGER NOT NULL,
    shared_with_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);