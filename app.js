// AI Travel Assistant - Enhanced JavaScript
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://ai-travel-assistant-api.onrender.com';

// DOM Elements
let currentUser = null;
let selectedInterests = [];
let selectedBudget = 1500;

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeDates();
    setupEventListeners();
    setupNavigation();
    loadRecentTrips();
    initializeChat();
});

// Initialize dates with defaults
function initializeDates() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const endDate = new Date(nextWeek);
    endDate.setDate(endDate.getDate() + 5);

    document.getElementById('startDate').valueAsDate = nextWeek;
    document.getElementById('endDate').valueAsDate = endDate;
    updateDurationValue(5);
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });

    // Form interactions
    document.getElementById('duration').addEventListener('input', function() {
        updateDurationValue(this.value);
    });

    document.getElementById('budget').addEventListener('input', function() {
        selectedBudget = parseInt(this.value) || 1500;
    });

    // Quick suggestions
    document.querySelectorAll('.quick-suggestion').forEach(btn => {
        btn.addEventListener('click', function() {
            const suggestion = this.getAttribute('onclick')
                .match(/sendSuggestion\('([^']+)'\)/)[1];
            document.getElementById('chatInput').value = suggestion;
            sendMessage();
        });
    });
}

// Navigation system
function setupNavigation() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');

    // Show first section by default
    showSection('chat');

    // Intersection Observer for active nav highlighting
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navLinks.forEach(link => {
                        link.classList.toggle(
                            'active',
                            link.getAttribute('href') === `#${id}`
                        );
                    });
                }
            });
        },
        { threshold: 0.5 }
    );

    sections.forEach(section => observer.observe(section));
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');

        // Smooth scroll to section
        targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Update URL without page reload
        history.pushState(null, null, `#${sectionId}`);
    }
}

// Chat functionality
function initializeChat() {
    // Add sample messages for demo
    setTimeout(() => {
        addSampleMessages();
    }, 1000);

    // Setup auto-resize for chat input
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Load chat history from localStorage
    const savedChat = localStorage.getItem('travelChatHistory');
    if (savedChat) {
        try {
            const messages = JSON.parse(savedChat);
            messages.forEach(msg => addMessageToChat(msg.text, msg.sender, false));
        } catch (e) {
            console.error('Error loading chat history:', e);
        }
    }
}

function addSampleMessages() {
    const sampleMessages = [
        {
            text: "I can help you find the best flight deals! Just tell me your destination and dates.",
            sender: 'ai'
        },
        {
            text: "Looking for hotel recommendations? I know the best places in each city!",
            sender: 'ai'
        }
    ];

    sampleMessages.forEach(msg => {
        setTimeout(() => {
            addMessageToChat(msg.text, msg.sender, false);
        }, msg.sender === 'ai' ? 1500 : 0);
    });
}

// Enhanced chat messaging
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    addMessageToChat(message, 'user');

    // Clear input and reset height
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    showTypingIndicator();

    try {
        // Send to AI service
        const response = await fetch(`${API_URL}/api/chat?message=${encodeURIComponent(message)}`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        // Add AI response
        addMessageToChat(data.response, 'ai');

        // Auto-detect travel planning intent
        detectTravelIntent(message, data);

        // Save to chat history
        saveChatToHistory(message, 'user');
        saveChatToHistory(data.response, 'ai');

    } catch (error) {
        removeTypingIndicator();
        addMessageToChat(
            "I'm having trouble connecting to the server. Please check your connection or try again later.",
            'ai'
        );
        console.error('Chat error:', error);
    }
}

function sendSuggestion(suggestion) {
    document.getElementById('chatInput').value = suggestion;
    sendMessage();
}

function addMessageToChat(text, sender, saveToHistory = true) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');

    messageDiv.className = `message ${sender}-message`;

    const avatar = sender === 'ai'
        ? '<i class="fas fa-robot"></i>'
        : '<i class="fas fa-user"></i>';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${avatar}
        </div>
        <div class="message-content">
            <div class="message-text">${formatMessageText(text)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (saveToHistory) {
        saveChatToHistory(text, sender);
    }
}

function formatMessageText(text) {
    // Convert URLs to links
    text = text.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Convert markdown-style bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert newlines to <br>
    text = text.replace(/\n/g, '<br>');

    // Convert lists
    text = text.replace(/^•\s+(.*)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return text;
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');

    typingDiv.className = 'message ai-message typing-indicator';
    typingDiv.id = 'typingIndicator';

    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function detectTravelIntent(userMessage, aiResponse) {
    const messageLower = userMessage.toLowerCase();

    if (messageLower.includes('plan') || messageLower.includes('trip') ||
        messageLower.includes('vacation') || messageLower.includes('itinerary')) {

        setTimeout(() => {
            addMessageToChat(
                "Would you like me to create a detailed itinerary for you? Click on 'Trip Planner' above or tell me your destination and dates!",
                'ai'
            );
        }, 2000);
    }

    if (messageLower.includes('flight') || messageLower.includes('fly')) {
        setTimeout(() => {
            addMessageToChat(
                "I can help you find flights! What's your departure city and destination?",
                'ai'
            );
        }, 2000);
    }

    if (messageLower.includes('hotel') || messageLower.includes('accommodation') ||
        messageLower.includes('stay')) {
        setTimeout(() => {
            addMessageToChat(
                "Need hotel recommendations? Tell me which city and dates you're looking for.",
                'ai'
            );
        }, 2000);
    }
}

function saveChatToHistory(text, sender) {
    let chatHistory = JSON.parse(localStorage.getItem('travelChatHistory') || '[]');

    chatHistory.push({
        text: text,
        sender: sender,
        timestamp: new Date().toISOString()
    });

    // Keep only last 50 messages
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }

    localStorage.setItem('travelChatHistory', JSON.stringify(chatHistory));
}

function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        document.getElementById('chatMessages').innerHTML = '';
        localStorage.removeItem('travelChatHistory');

        // Add initial message
        addMessageToChat(
            "Hello! I'm your AI travel assistant. I can help you plan trips, find flights and hotels, and provide travel recommendations. How can I assist you today?",
            'ai',
            false
        );
    }
}

// Trip Planner functionality
function updateDurationValue(value) {
    document.getElementById('durationValue').textContent = `${value} day${value > 1 ? 's' : ''}`;
}

function selectBudget(amount, element) {
    selectedBudget = amount;

    // Update UI
    document.querySelectorAll('.budget-option').forEach(option => {
        option.classList.remove('active');
    });

    element.classList.add('active');
    document.getElementById('budget').value = amount;
}

function adjustTravelers(change) {
    const travelerCount = document.getElementById('travelerCount');
    let count = parseInt(travelerCount.textContent) + change;

    if (count < 1) count = 1;
    if (count > 10) count = 10;

    travelerCount.textContent = count;
}

function toggleInterest(element) {
    element.classList.toggle('active');

    // Update selected interests array
    selectedInterests = Array.from(document.querySelectorAll('.interest-tag.active'))
        .map(tag => tag.textContent.trim());

    console.log('Selected interests:', selectedInterests);
}

async function planTrip(event) {
    event.preventDefault();

    // Gather form data
    const formData = {
        destination: document.getElementById('destination').value.trim(),
        tripType: document.getElementById('tripType').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        duration: document.getElementById('duration').value,
        budget: selectedBudget,
        travelers: parseInt(document.getElementById('travelerCount').textContent),
        interests: selectedInterests,
        notes: document.getElementById('additionalNotes').value.trim()
    };

    // Validation
    if (!formData.destination) {
        showNotification('Please enter a destination', 'error');
        return;
    }

    if (!formData.startDate || !formData.endDate) {
        showNotification('Please select travel dates', 'error');
        return;
    }

    // Show loading state
    const submitBtn = event.target.querySelector('.btn-primary') ||
                     document.querySelector('#tripForm .btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    submitBtn.disabled = true;

    try {
        // Call API
        const response = await fetch(
            `${API_URL}/api/travel/plan?destination=${encodeURIComponent(formData.destination)}&days=${formData.duration}&budget=${formData.budget}`
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            displayTripResults(data.plan, formData);
            showNotification('Trip planned successfully!', 'success');

            // Suggest similar trips in chat
            setTimeout(() => {
                addMessageToChat(
                    `I've created a ${formData.duration}-day trip plan for ${formData.destination} within your budget of $${formData.budget}. Would you like me to help with flights or hotels too?`,
                    'ai'
                );
            }, 1000);
        } else {
            throw new Error(data.detail || 'Failed to plan trip');
        }

    } catch (error) {
        console.error('Trip planning error:', error);
        showNotification(`Failed to plan trip: ${error.message}`, 'error');

        // Show fallback demo data
        displayDemoTripResults(formData);

    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function displayTripResults(plan, formData) {
    const resultsDiv = document.getElementById('tripResults');

    // Calculate date range
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const dateRange = startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString();

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Create results HTML
    let html = `
        <div class="results-header">
            <h3><i class="fas fa-check-circle success"></i> Trip to ${plan.destination} Planned!</h3>
            <p class="trip-meta">${formData.duration} days • ${dateRange} • ${formData.travelers} traveler${formData.travelers > 1 ? 's' : ''}</p>
        </div>

        <div class="trip-summary">
            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-tag"></i>
                </div>
                <div>
                    <h4>Trip Type</h4>
                    <p>${plan.trip_type || formData.tripType}</p>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div>
                    <h4>Total Budget</h4>
                    <p>${formatCurrency(formData.budget)}</p>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div>
                    <h4>Estimated Cost</h4>
                    <p>${formatCurrency(plan.estimated_cost || formData.budget * 0.8)}</p>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-coins"></i>
                </div>
                <div>
                    <h4>Cost Level</h4>
                    <p class="cost-level ${(plan.cost_level || 'moderate').toLowerCase()}">
                        ${plan.cost_level || 'Moderate'}
                    </p>
                </div>
            </div>
        </div>

        <div class="itinerary-section">
            <h4><i class="fas fa-route"></i> Daily Itinerary</h4>
            <div class="itinerary-list">
    `;

    // Add itinerary items
    const itinerary = plan.itinerary || Array.from({ length: formData.duration }, (_, i) =>
        `Day ${i + 1}: Explore ${formData.destination} and discover local attractions`
    );

    itinerary.forEach((item, index) => {
        html += `
            <div class="itinerary-item">
                <div class="day-number">Day ${index + 1}</div>
                <div class="day-activity">${item}</div>
                <div class="day-tips">
                    <i class="fas fa-lightbulb"></i>
                    <small>${getRandomTip()}</small>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        <div class="recommendations-section">
            <h4><i class="fas fa-star"></i> AI Recommendations</h4>
            <div class="recommendations-grid">
    `;

    // Add recommendations
    const recommendations = plan.recommendations || [
        'Try local cuisine at authentic restaurants',
        'Visit popular landmarks in the morning to avoid crowds',
        'Use public transportation for cost-effective travel',
        'Book activities in advance for better prices'
    ];

    recommendations.forEach(rec => {
        html += `
            <div class="recommendation-card">
                <i class="fas fa-check-circle"></i>
                <p>${rec}</p>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        <div class="actions-section">
            <button class="btn-primary" onclick="saveTrip('${plan.trip_id || Date.now()}')">
                <i class="fas fa-save"></i> Save Trip
            </button>
            <button class="btn-secondary" onclick="shareTrip('${formData.destination}')">
                <i class="fas fa-share-alt"></i> Share
            </button>
            <button class="btn-outline" onclick="findFlights('${formData.destination}')">
                <i class="fas fa-plane"></i> Find Flights
            </button>
            <button class="btn-outline" onclick="findHotels('${formData.destination}')">
                <i class="fas fa-bed"></i> Find Hotels
            </button>
        </div>
    `;

    resultsDiv.innerHTML = html;
    resultsDiv.classList.add('has-results');
}

function displayDemoTripResults(formData) {
    const resultsDiv = document.getElementById('tripResults');

    resultsDiv.innerHTML = `
        <div class="demo-results">
            <h3><i class="fas fa-info-circle"></i> Demo Trip Plan</h3>
            <p>While our AI is preparing your personalized plan, here's a sample itinerary:</p>

            <div class="demo-itinerary">
                <h4>Sample 3-Day ${formData.destination} Itinerary</h4>
                <ul>
                    <li><strong>Day 1:</strong> Arrival, check-in, explore city center</li>
                    <li><strong>Day 2:</strong> Visit main attractions and landmarks</li>
                    <li><strong>Day 3:</strong> Local culture experience, departure</li>
                </ul>
            </div>

            <div class="demo-tips">
                <h4>Travel Tips:</h4>
                <p>• Best time to visit: Spring or Fall</p>
                <p>• Local currency: Check exchange rates</p>
                <p>• Transportation: Use local transit apps</p>
            </div>

            <button class="btn-primary" onclick="retryTripPlanning()">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

function getRandomTip() {
    const tips = [
        'Book tickets online to skip lines',
        'Try local street food for authentic experience',
        'Visit early to avoid crowds',
        'Carry local currency for small purchases',
        'Learn basic local phrases',
        'Check weather forecast daily',
        'Use sunscreen and stay hydrated'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

function saveTrip(tripId) {
    // In a real app, this would save to backend
    showNotification('Trip saved to your profile!', 'success');

    // For demo, save to localStorage
    const tripData = {
        id: tripId,
        destination: document.getElementById('destination').value,
        date: new Date().toISOString(),
        saved: true
    };

    let savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
    savedTrips.unshift(tripData);
    localStorage.setItem('savedTrips', JSON.stringify(savedTrips));
}

function shareTrip(destination) {
    const shareUrl = window.location.href.split('#')[0] + `?destination=${encodeURIComponent(destination)}`;

    if (navigator.share) {
        navigator.share({
            title: `My trip to ${destination}`,
            text: `Check out my AI-planned trip to ${destination}!`,
            url: shareUrl
        });
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('Trip link copied to clipboard!', 'success');
        });
    }
}

function findFlights(destination) {
    showNotification(`Searching flights to ${destination}...`, 'info');
    // In a real app, this would redirect to flights section
    showSection('flights');
}

function findHotels(destination) {
    showNotification(`Searching hotels in ${destination}...`, 'info');
    // In a real app, this would redirect to hotels section
    showSection('hotels');
}

function retryTripPlanning() {
    document.getElementById('tripResults').innerHTML = `
        <div class="results-placeholder">
            <div class="placeholder-icon">
                <i class="fas fa-compass"></i>
            </div>
            <h3>Your Itinerary Awaits</h3>
            <p>Fill in your trip details and click "Generate" to create a personalized itinerary powered by AI.</p>
        </div>
    `;
    document.getElementById('tripResults').classList.remove('has-results');
}

function resetForm() {
    document.getElementById('tripForm').reset();
    selectedBudget = 1500;
    selectedInterests = [];

    document.querySelectorAll('.budget-option').forEach((option, index) => {
        option.classList.toggle('active', index === 1);
    });

    document.querySelectorAll('.interest-tag').forEach(tag => {
        tag.classList.toggle('active',
            tag.textContent.includes('Beaches') ||
            tag.textContent.includes('Nature')
        );
    });

    initializeDates();
    showNotification('Form reset to defaults', 'info');
}

// Utility functions
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

async function loadRecentTrips() {
    try {
        const response = await fetch(`${API_URL}/api/travel/recent?limit=3`);
        if (response.ok) {
            const data = await response.json();
            if (data.trips && data.trips.length > 0) {
                // Could display these in a section
                console.log('Recent trips loaded:', data.trips);
            }
        }
    } catch (error) {
        console.log('Could not load recent trips:', error);
    }
}

// Export functions for HTML onclick attributes
window.sendMessage = sendMessage;
window.sendSuggestion = sendSuggestion;
window.clearChat = clearChat;
window.planTrip = planTrip;
window.selectBudget = selectBudget;
window.adjustTravelers = adjustTravelers;
window.toggleInterest = toggleInterest;
window.resetForm = resetForm;
window.updateDurationValue = updateDurationValue;
window.saveTrip = saveTrip;
window.shareTrip = shareTrip;
window.findFlights = findFlights;
window.findHotels = findHotels;
window.retryTripPlanning = retryTripPlanning;