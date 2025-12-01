#!/bin/bash

# Ethiopian Tutor Seeder Script
echo "🇪🇹 Seeding Ethiopian Tutors..."
echo "================================="

BASE_URL="http://localhost:8000"

# Function to register a tutor
register_tutor() {
    local first_name="$1"
    local last_name="$2"
    local email="$3"
    local phone="$4"
    local subjects="$5"
    local city="$6"
    local rate="$7"
    local bio="$8"

    echo "Registering: $first_name $last_name..."

    # Register user
    response=$(curl -s -X POST "$BASE_URL/api/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "'$email'",
            "password": "password123",
            "first_name": "'$first_name'",
            "last_name": "'$last_name'",
            "phone": "'$phone'",
            "role": "tutor"
        }')

    # Extract token (simplified - assumes successful registration)
    token=$(echo $response | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

    if [ ! -z "$token" ]; then
        echo "✅ Registered: $first_name $last_name"

        # Update profile
        curl -s -X PUT "$BASE_URL/api/tutor/profile" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d '{
                "bio": "'$bio'",
                "subjects": ["'$(echo $subjects | sed 's/,/", "/g')'"],
                "grades": ["Grade 9-10", "Grade 11-12"],
                "hourly_rate": '$rate',
                "experience_years": 5,
                "city": "'$city'",
                "teaching_methods": ["Online", "In-person"],
                "is_active": true,
                "profile_complete": true
            }' > /dev/null

        echo "   📝 Profile updated - $subjects - $city"
    else
        echo "❌ Failed to register: $first_name $last_name"
    fi
}

# Register Ethiopian tutors
register_tutor "Abebe" "Kebede" "abebe.kebede@tutors.et" "+251911234567" "Mathematics,Physics" "Addis Ababa" 250 "Experienced mathematics teacher with 8 years in secondary education."

register_tutor "Bethlehem" "Hailu" "bethlehem.hailu@tutors.et" "+251911234568" "Chemistry,Biology" "Addis Ababa" 280 "Passionate science educator helping students excel in natural sciences."

register_tutor "Dawit" "Assefa" "dawit.assefa@tutors.et" "+251911234569" "English,Amharic" "Bahir Dar" 200 "Language specialist with expertise in both Ethiopian and international curricula."

register_tutor "Almaz" "Girma" "almaz.girma@tutors.et" "+251911234570" "Economics,Accounting" "Hawassa" 220 "Business studies expert with real-world industry experience."

register_tutor "Getachew" "Wolde" "getachew.wolde@tutors.et" "+251911234571" "History,Geography" "Gondar" 190 "Social studies teacher passionate about Ethiopian history and culture."

register_tutor "Tigist" "Lemma" "tigist.lemma@tutors.et" "+251911234572" "Computer Science,IT" "Dire Dawa" 300 "Technology educator specializing in programming and digital literacy."

register_tutor "Henok" "Bekele" "henok.bekele@tutors.et" "+251911234573" "Mathematics,Statistics" "Mekelle" 260 "Mathematics specialist with focus on advanced problem-solving techniques."

register_tutor "Meron" "Tesfaye" "meron.tesfaye@tutors.et" "+251911234574" "French,Arabic" "Addis Ababa" 240 "Multilingual educator with international teaching certification."

register_tutor "Sisay" "Regassa" "sisay.regassa@tutors.et" "+251911234575" "Physics,Engineering" "Jimma" 290 "Engineering graduate specializing in applied physics and mathematics."

register_tutor "Hiwot" "Negash" "hiwot.negash@tutors.et" "+251911234576" "Biology,Chemistry" "Addis Ababa" 270 "Medical school graduate with expertise in life sciences."

register_tutor "Tadesse" "Mulatu" "tadesse.mulatu@tutors.et" "+251911234577" "Mathematics,Physics" "Bahir Dar" 230 "Experienced tutor specializing in exam preparation and concept building."

register_tutor "Kidist" "Yimer" "kidist.yimer@tutors.et" "+251911234578" "English,Literature" "Hawassa" 210 "Literature enthusiast helping students develop critical thinking and writing skills."

echo ""
echo "🎉 Finished seeding Ethiopian tutors!"
echo "Testing tutors endpoint..."

# Test the endpoint
curl -s -X GET "$BASE_URL/api/tutors" | python -m json.tool

echo "✅ Seeding complete! Check find-tutors.html now."