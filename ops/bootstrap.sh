#!/bin/bash
    # Script to install Docker and Docker Compose plugin on Ubuntu 22.04
    
    # Exit immediately if a command exits with a non-zero status.
    set -e
    
    echo "Starting Docker and Docker Compose plugin installation..."
    
    # Update package information
    echo "Updating package information..."
    sudo apt-get update -y
    
    # Install packages to allow apt to use a repository over HTTPS
    echo "Installing prerequisite packages..."
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker’s official GPG key
    echo "Adding Docker GPG key..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    
    # Set up the repository
    echo "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package information again after adding new repository
    echo "Updating package information again..."
    sudo apt-get update -y
    
    # Install Docker Engine, CLI, Containerd, and Docker Compose plugin
    echo "Installing Docker Engine, CLI, Containerd, and Docker Compose plugin..."
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Verify Docker installation by running the hello-world image
    echo "Verifying Docker installation..."
    sudo docker run hello-world
    
    # Add current user to the docker group to run docker commands without sudo
    # You will need to log out and log back in for this to take effect.
    echo "Adding current user to the docker group..."
    sudo usermod -aG docker ${USER}
    
    echo "Docker and Docker Compose plugin installation completed."
    echo "Please log out and log back in for group changes to take effect, or run 'newgrp docker' to apply changes to the current shell."
    