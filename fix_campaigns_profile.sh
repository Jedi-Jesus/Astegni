#!/bin/bash

# Fix the indentation and structure of manage-campaigns.html profile header

# Fix cover container indentation
sed -i '162s/^                    <div/                            <div/' admin-pages/manage-campaigns.html

# Fix cover image
sed -i '163,164s|^                        <img.*|                                <img src="data:image/svg+xml,%3Csvg xmlns='\''http://www.w3.org/2000/svg'\'' width='\''1200'\'' height='\''300'\''%3E%3Crect width='\''1200'\'' height='\''300'\'' fill='\''%23e5e7eb'\''/%3E%3Ctext x='\''50%25'\'' y='\''50%25'\'' text-anchor='\''middle'\'' dy='\''.3em'\'' fill='\''%239ca3af'\'' font-family='\''sans-serif'\'' font-size='\''20'\''%3E1200x300%3C/text%3E%3C/svg%3E"|' admin-pages/manage-campaigns.html
sed -i '164s/^.*/                                    alt="Cover" class="cover-img">/' admin-pages/manage-campaigns.html

# Fix cover overlay and button
sed -i '165,167s/^                        /                                /' admin-pages/manage-campaigns.html
sed -i '168s/class=".*"/class="cover-upload-btn"/' admin-pages/manage-campaigns.html

# Fix SVG indentation
sed -i '169,175s/^                            /                                    /' admin-pages/manage-campaigns.html

# Fix closing button and div
sed -i '176s/^                        </button>/                                </button>/' admin-pages/manage-campaigns.html  
sed -i '177s/^                    </div>/                            </div>/' admin-pages/manage-campaigns.html

echo "Fixed profile header structure in manage-campaigns.html"
