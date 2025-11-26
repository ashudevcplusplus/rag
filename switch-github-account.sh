#!/bin/bash

# Script to switch between Professional and Personal GitHub accounts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/.github-accounts-config"

PROFESSIONAL_NAME="ashutosh-gupta-tjs"
PROFESSIONAL_EMAIL="ashutosh.gupta@trajectorservices.com"

# Load personal account config if exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

if [ "$1" == "professional" ] || [ "$1" == "work" ]; then
    git config --global user.name "$PROFESSIONAL_NAME"
    git config --global user.email "$PROFESSIONAL_EMAIL"
    echo "✓ Switched to Professional account: $PROFESSIONAL_NAME"
    echo "  Email: $PROFESSIONAL_EMAIL"
    # Switch GitHub CLI to professional account
    CURRENT_GH_USER=$(gh api user --jq '.login' 2>/dev/null)
    if [ "$CURRENT_GH_USER" != "$PROFESSIONAL_NAME" ]; then
        echo "  Switching GitHub CLI account to $PROFESSIONAL_NAME..."
        # gh auth switch will show a menu to select the account
        gh auth switch --hostname github.com 2>&1 | grep -q "$PROFESSIONAL_NAME" && echo "  ✓ GitHub CLI switched" || \
        echo "  ℹ Run 'gh auth switch' and select $PROFESSIONAL_NAME if needed"
    else
        echo "  ✓ GitHub CLI already on $PROFESSIONAL_NAME"
    fi
elif [ "$1" == "personal" ]; then
    if [ -z "$PERSONAL_NAME" ] || [ -z "$PERSONAL_EMAIL" ]; then
        echo "Personal account not configured. Please provide details:"
        read -p "Enter your personal GitHub username: " PERSONAL_NAME
        read -p "Enter your personal GitHub email: " PERSONAL_EMAIL
        # Save to config file
        echo "PERSONAL_NAME=\"$PERSONAL_NAME\"" > "$CONFIG_FILE"
        echo "PERSONAL_EMAIL=\"$PERSONAL_EMAIL\"" >> "$CONFIG_FILE"
        echo "✓ Personal account details saved"
    fi
    git config --global user.name "$PERSONAL_NAME"
    git config --global user.email "$PERSONAL_EMAIL"
    echo "✓ Switched to Personal account: $PERSONAL_NAME"
    echo "  Email: $PERSONAL_EMAIL"
    # Switch GitHub CLI to personal account
    CURRENT_GH_USER=$(gh api user --jq '.login' 2>/dev/null)
    if [ "$CURRENT_GH_USER" != "$PERSONAL_NAME" ]; then
        echo "  Switching GitHub CLI account to $PERSONAL_NAME..."
        # gh auth switch will show a menu to select the account
        gh auth switch --hostname github.com 2>&1 | grep -q "$PERSONAL_NAME" && echo "  ✓ GitHub CLI switched" || \
        echo "  ℹ Run 'gh auth switch' and select $PERSONAL_NAME if needed"
    else
        echo "  ✓ GitHub CLI already on $PERSONAL_NAME"
    fi
elif [ "$1" == "setup-personal" ]; then
    if [ -n "$2" ] && [ -n "$3" ]; then
        PERSONAL_NAME="$2"
        PERSONAL_EMAIL="$3"
    else
        echo "Enter your personal GitHub account details:"
        read -p "Username: " PERSONAL_NAME
        read -p "Email: " PERSONAL_EMAIL
    fi
    if [ -z "$PERSONAL_NAME" ] || [ -z "$PERSONAL_EMAIL" ]; then
        echo "Error: Both username and email are required"
        echo "Usage: $0 setup-personal <username> <email>"
        exit 1
    fi
    echo "PERSONAL_NAME=\"$PERSONAL_NAME\"" > "$CONFIG_FILE"
    echo "PERSONAL_EMAIL=\"$PERSONAL_EMAIL\"" >> "$CONFIG_FILE"
    echo "✓ Personal account configured: $PERSONAL_NAME ($PERSONAL_EMAIL)"
elif [ "$1" == "status" ] || [ "$1" == "" ]; then
    CURRENT_NAME=$(git config --global user.name)
    CURRENT_EMAIL=$(git config --global user.email)
    echo "Current Git Configuration:"
    echo "  Name: $CURRENT_NAME"
    echo "  Email: $CURRENT_EMAIL"
    echo ""
    echo "GitHub CLI Status:"
    gh auth status 2>/dev/null || echo "  Not authenticated"
    echo ""
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        echo "Configured Accounts:"
        echo "  Professional: $PROFESSIONAL_NAME ($PROFESSIONAL_EMAIL)"
        echo "  Personal: $PERSONAL_NAME ($PERSONAL_EMAIL)"
    fi
else
    echo "Usage: $0 [professional|work|personal|setup-personal|status]"
    echo ""
    echo "Commands:"
    echo "  professional, work     - Switch to professional account"
    echo "  personal               - Switch to personal account"
    echo "  setup-personal [user] [email] - Configure personal account details"
    echo "                          (can provide username and email as arguments)"
    echo "  status                 - Show current account configuration"
fi

