#!/bin/bash

# Fix manage-courses.html profile header
sed -i '181,182s/^                                /                                        /' admin-pages/manage-courses.html
sed -i '183,184s/class="profile-avatar w-32 h-32 rounded-full border-4 border-white shadow-lg"/class="profile-avatar"/' admin-pages/manage-courses.html
sed -i '183,184s/                                <span/                                        <span/' admin-pages/manage-courses.html
sed -i '184s/class="online-indicator absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"/class="online-indicator"/' admin-pages/manage-courses.html
