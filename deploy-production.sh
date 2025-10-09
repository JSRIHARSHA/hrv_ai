#!/bin/bash

# Production Deployment Script for Order Management Application
# This script provides multiple deployment options

echo "🚀 Order Management App - Production Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v14 or higher."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.7 or higher."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Local network deployment
deploy_local_network() {
    print_status "Setting up local network deployment..."
    
    # Get local IP address
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP=$(ip route get 1 | awk '{print $7}' | head -n1)
    fi
    
    print_status "Your local IP address: $LOCAL_IP"
    print_status "Application will be accessible at: http://$LOCAL_IP:3001"
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    pip3 install -r requirements.txt
    
    # Create uploads directory
    mkdir -p uploads
    
    # Start the application
    print_status "Starting application..."
    print_warning "Press Ctrl+C to stop the application"
    
    # Start backend
    node server.js &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 3
    
    # Start frontend
    npm start &
    FRONTEND_PID=$!
    
    print_success "Application started successfully!"
    print_status "Frontend: http://$LOCAL_IP:3000"
    print_status "Backend API: http://$LOCAL_IP:3001"
    print_status "Health Check: http://$LOCAL_IP:3001/health"
    
    # Wait for user to stop
    wait $BACKEND_PID
}

# Docker deployment
deploy_docker() {
    print_status "Setting up Docker deployment..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Build and start containers
    print_status "Building Docker image..."
    docker build -t order-management-app .
    
    print_status "Starting containers with Docker Compose..."
    docker-compose up -d
    
    print_success "Docker deployment completed!"
    print_status "Application is running at: http://localhost"
    print_status "Backend API: http://localhost:3001"
    print_status "Health Check: http://localhost:3001/health"
    
    # Show container status
    docker-compose ps
}

# Heroku deployment
deploy_heroku() {
    print_status "Setting up Heroku deployment..."
    
    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        print_error "Heroku CLI is not installed. Please install it from https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Login to Heroku
    print_status "Please login to Heroku..."
    heroku login
    
    # Get app name
    read -p "Enter Heroku app name (or press Enter to auto-generate): " APP_NAME
    
    if [ -z "$APP_NAME" ]; then
        APP_NAME="order-management-$(date +%s)"
    fi
    
    # Create Heroku app
    print_status "Creating Heroku app: $APP_NAME"
    heroku create $APP_NAME
    
    # Set environment variables
    print_status "Setting environment variables..."
    heroku config:set NODE_ENV=production
    heroku config:set PYTHON_VERSION=3.9.0
    
    # Deploy
    print_status "Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku"
    git push heroku main
    
    print_success "Heroku deployment completed!"
    print_status "Application URL: https://$APP_NAME.herokuapp.com"
    
    # Open in browser
    heroku open
}

# Railway deployment
deploy_railway() {
    print_status "Setting up Railway deployment..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed. Please install it from https://docs.railway.app/develop/cli"
        exit 1
    fi
    
    # Login to Railway
    print_status "Please login to Railway..."
    railway login
    
    # Initialize and deploy
    print_status "Initializing Railway project..."
    railway init
    
    print_status "Deploying to Railway..."
    railway up
    
    print_success "Railway deployment completed!"
    print_status "Check your Railway dashboard for the application URL"
}

# Vercel deployment
deploy_vercel() {
    print_status "Setting up Vercel deployment..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed. Please install it with: npm i -g vercel"
        exit 1
    fi
    
    # Login to Vercel
    print_status "Please login to Vercel..."
    vercel login
    
    # Deploy
    print_status "Deploying to Vercel..."
    vercel --prod
    
    print_success "Vercel deployment completed!"
}

# Main menu
show_menu() {
    echo ""
    echo "Select deployment option:"
    echo "1) Local Network Deployment (Quick testing)"
    echo "2) Docker Deployment (Containerized)"
    echo "3) Heroku Deployment (Cloud - Free tier)"
    echo "4) Railway Deployment (Cloud - Modern)"
    echo "5) Vercel Deployment (Cloud - Frontend focused)"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
}

# Main execution
main() {
    check_prerequisites
    
    while true; do
        show_menu
        case $choice in
            1)
                deploy_local_network
                break
                ;;
            2)
                deploy_docker
                break
                ;;
            3)
                deploy_heroku
                break
                ;;
            4)
                deploy_railway
                break
                ;;
            5)
                deploy_vercel
                break
                ;;
            6)
                print_status "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-6."
                ;;
        esac
    done
    
    echo ""
    print_success "Deployment completed successfully! 🎉"
    echo ""
    print_status "Next steps:"
    echo "- Share the application URL with your testers"
    echo "- Monitor the application logs"
    echo "- Test all functionality"
    echo "- Set up SSL certificates for production (recommended)"
}

# Run main function
main
