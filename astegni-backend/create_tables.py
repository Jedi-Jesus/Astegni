# create_tables.py
from app import engine, Base

# This will create all new tables
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")