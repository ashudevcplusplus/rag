#!/bin/bash

# Script to switch git user profile based on git config profiles
# Usage: ./switch-git-user.sh <profile-name>

PROFILE=$1

if [ -z "$PROFILE" ]; then
  echo "Usage: $0 <profile-name>"
  echo "Available profiles found in global git config:"
  git config --global --get-regexp "^profile\." | cut -d. -f2 | sort | uniq
  exit 1
fi

NAME=$(git config --global profile.$PROFILE.name)
EMAIL=$(git config --global profile.$PROFILE.email)

if [ -n "$NAME" ] && [ -n "$EMAIL" ]; then
  git config user.name "$NAME"
  git config user.email "$EMAIL"
  echo "✅ Switched git user to profile '$PROFILE'"
  echo "   Name:  $NAME"
  echo "   Email: $EMAIL"
else
  echo "❌ Profile '$PROFILE' not found or incomplete in global git config."
  echo "   Make sure 'profile.$PROFILE.name' and 'profile.$PROFILE.email' are set."
  exit 1
fi


