#!/usr/bin/env python3
"""
Script to create an admin user for PaceUp.
Run this script to create your personal account.
"""

import sys
from getpass import getpass
from app.db.schema import SessionLocal, User
from app.core.security import get_password_hash


def create_user():
    """Create a new user interactively"""
    print("=== PaceUp User Creation ===\n")
    
    # Get user input
    email = input("Email: ").strip()
    if not email:
        print("Error: Email is required")
        sys.exit(1)
    
    password = getpass("Password: ")
    password_confirm = getpass("Confirm password: ")
    
    if password != password_confirm:
        print("Error: Passwords don't match")
        sys.exit(1)
    
    if len(password) < 8:
        print("Error: Password must be at least 8 characters")
        sys.exit(1)
    
    firstname = input("First name (optional): ").strip() or None
    lastname = input("Last name (optional): ").strip() or None
    
    # Create user
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"\n❌ Error: User with email '{email}' already exists")
            sys.exit(1)
        
        # Create new user
        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            firstname=firstname,
            lastname=lastname,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"\n✅ Success! User created:")
        print(f"   Email: {new_user.email}")
        if new_user.firstname:
            print(f"   Name: {new_user.firstname} {new_user.lastname or ''}")
        print(f"\nYou can now login at the frontend with these credentials.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error creating user: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_user()

