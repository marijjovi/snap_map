let map;


async function initMap() {
    console.log("Initializing map...");
    
    // Create basic map
    map = L.map('map').setView([41.9500, -87.6600], 11);
    console.log("Map created");
    
    // Add tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    console.log("Tiles added");
    
    // Load and plot locations
    const locations = await loadLocations();
    plotLocations(locations);
    updateResultsList(locations);

    setupSearch();

    startStatusUpdates();
    
}

async function loadLocations() {
  
    
    console.log("Loading locations from JSON file");
    
    try {
        // Fetch the locations.json file
        const response = await fetch('locations.json');
        
        if (!response.ok) {
            throw new Error(`Failed to load locations: ${response.status}`);
        }
        
        const locations = await response.json();
        console.log("Successfully loaded", locations.length, "locations from JSON file");
        return locations;
    } catch (error) {
        console.error("Error loading locations.json:", error);
    }
}

function plotLocations(locations) {
    console.log("Plotting", locations.length, "locations on map");
    
    locations.forEach(location => {
        console.log("Adding marker for:", location.name);
        
        const isOpen = isLocationOpen(location);
        const statusColor = isOpen ? 'green' : 'red';
        const statusText = isOpen ? 'OPEN' : 'CLOSED';
        const markerColor = isOpen ? '#27ae60' : '#e74c3c';
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html:`<div style="background-color: ${markerColor}; width: 16px; height: 16px;
            border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]});
        
        const marker = L.marker([location.lat, location.lng],{ icon: customIcon })
            .addTo(map)
            .bindPopup(`
                <div>
                    <h3>${location.name}</h3>
                    <p>${location.address}</p>
                    <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                    <p><strong>Type:</strong> ${location.type}</p>
                </div>
            `);
        
        
    });
    
    console.log("All markers added to map");
}

function updateResultsList(locations) {
    console.log("Updating sidebar with", locations.length, "locations");
    
    const resultsList = document.getElementById('results-list');
    
    if (locations.length === 0) {
        resultsList.innerHTML = '<div class="empty-state">No locations found</div>';
        return;
    }
    
    const locationsHTML = locations.map(location => {
        const isOpen = isLocationOpen(location);
        const statusClass = isOpen ? 'status-open' : 'status-closed';
        const statusText = isOpen ? 'DISTRIBUTING' : 'CLOSED';
        const distance = location.distance ? `${location.distance.toFixed(1)} miles away` : '';
        
        return `
            <div class="location-card">
                <div class="location-name">${location.name}</div>
                <div class="location-address">${location.address}</div>
                <div class="location-distance">${distance}</div>
                <div class="location-status ${statusClass}">${statusText}</div>
                <div class="location-type">${location.type}</div>
                <div class = "hours-dist" style="font-weight: bold;">Hours of Distribution: </div>
                <div class="hours-container">${hoursofDistribution(location)}</div>
            </div>
        `;
    }).join('');
    
    resultsList.innerHTML = locationsHTML;
    console.log("Sidebar updated successfully");
}

function hoursofDistribution(location) {
    
   const hoursCont = location.hours  
   let hoursHTML = '';
   for (const [day, hours] of Object.entries(hoursCont)) {
        hoursHTML += `
            <div class="hours-item">
                <span class="day"> <p style="color: firebrick;"> ${capitalizeFirstLetter(day)}</p></span>
                <span class="time">${amandpmTime(hours)}</span>
            </div>
        `;
    }  

    return hoursHTML; 
   
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function amandpmTime(hours){
    const [start, end] = hours.split('-');
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatTime(string) {
    const [hours, minutes] = string.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}


function setupSearch() {
    console.log("Setting up search functionality");
    
    const searchBtn = document.getElementById('search-btn');
    const addressInput = document.getElementById('address-input');
    
    searchBtn.addEventListener('click', handleSearch);
    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    console.log("Search event listeners added");
}

async function handleSearch() {
    console.log("Search button clicked");
    
    const addressInput = document.getElementById('address-input');
    const userAddress = addressInput.value.trim();
    
    if (!userAddress) {
        alert('Please enter an address');
        return;
    }
    
    try {
        const searchBtn = document.getElementById('search-btn');
        searchBtn.textContent = 'Searching...';
        searchBtn.disabled = true;
        
        console.log("Searching for address:", userAddress);
        
       
        const geocodeResults = await fetchGeocode(userAddress);
        console.log("Geocoding results:", geocodeResults);
        
        if (geocodeResults.length === 0) {
            alert('Address not found. Please try again.');
            return;
        }
        
        // Get user coordinates from first result
        const userCoords = {
            lat: parseFloat(geocodeResults[0].lat),
            lng: parseFloat(geocodeResults[0].lon)
        };
        
        console.log("User coordinates:", userCoords);
        
        // Find nearest locations
        const allLocations = loadLocations();
        const nearestLocations = findNearestLocations(userCoords, allLocations, 5);
        
        // Update map and results
        plotLocations(nearestLocations);
        updateResultsList(nearestLocations);
        
        // Center map on user location
        map.setView([userCoords.lat, userCoords.lng], 13);
        
        console.log("Search completed successfully");
        
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed: ' + error.message);
    } finally {
        const searchBtn = document.getElementById('search-btn');
        searchBtn.textContent = 'Find Nearest Locations';
        searchBtn.disabled = false;
    }
}

function findNearestLocations(userCoords, locations, limit = 5) {
    console.log("Finding nearest locations to:", userCoords);
    
    // Calculate distance for each location
    const locationsWithDistance = locations.map(location => {
        const distance = calculateDistance(
            userCoords.lat, userCoords.lng,
            location.lat, location.lng
        );
        return { ...location, distance };
    });
    
    console.log("Locations with distances:", locationsWithDistance);
    
    // Sort by distance and return top results
    const nearest = locationsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    
    console.log("Nearest locations:", nearest);
    return nearest;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance between two coordinates
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in miles
    
    console.log(`Distance from (${lat1},${lon1}) to (${lat2},${lon2}): ${distance} miles`);
    return distance;
}

function startStatusUpdates() {
    console.log("Starting real-time status updates");
    
    // Update status every minute
    setInterval(() => {
        console.log("Updating open/closed statuses");
        const allLocations = loadLocations();
        plotLocations(allLocations);
        updateResultsList(allLocations);
    }, 60000); // 60 seconds
    
    // Also update when the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log("Tab became visible - updating statuses");
            const allLocations = loadLocations();
            plotLocations(allLocations);
            updateResultsList(allLocations);
        }
    });
}

async function fetchGeocode(address) {
    try {
        // Call the Netlify function
        const response = await fetch(`/.netlify/functions/geocode?address=${encodeURIComponent(address)}`);
        
        if (!response.ok) {
            throw new Error('Geocoding failed');
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

function focusOnLocation(lat, lng, name) {
    console.log("Focusing on location:", name);
    
    // Center map on location
    map.setView([lat, lng], 16);
    
    // Find and open the popup for this location
    markers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (markerLatLng.lat === lat && markerLatLng.lng === lng) {
            marker.openPopup();
        }
    });
}

function isLocationOpen(location) {
    console.log("Checking if", location.name, "is open");
    
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const currentTime = now.getHours() + (now.getMinutes() / 60);
    
    // Map day numbers to our hours keys
    const dayMap = {
        0: 'sunday',
        1: 'monday', 
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
    };
    
    const today = dayMap[currentDay];
    const hoursToday = location.hours[today];
    
    console.log("Today is", today, "hours:", hoursToday);
    
    if (!hoursToday || hoursToday === 'closed') {
        console.log(location.name, "is closed today");
        return false;
    }
    
    // Parse hours like "9:00-17:00"
    const [openTimeStr, closeTimeStr] = hoursToday.split('-');
    const openTime = parseTimeString(openTimeStr);
    const closeTime = parseTimeString(closeTimeStr);
    
    console.log("Open time:", openTime, "Close time:", closeTime, "Current time:", currentTime);
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    console.log(location.name, "is", isOpen ? "OPEN" : "CLOSED");
    
    return isOpen;
}

function parseTimeString(timeStr) {
    // Handle time like "9:00" or "17:30"
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
}

// Start the app
console.log("Setting up event listener...");
document.addEventListener('DOMContentLoaded', initMap);
console.log("Event listener set up");