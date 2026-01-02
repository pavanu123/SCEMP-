// Carbon Calculation Data (kg CO2 saved per kg of material recycled)
const carbonData = {
    plastic: {
        co2PerKg: 2.5,
        energyPerKg: 25, // kWh
        waterPerKg: 50,  // liters
        treesPerKg: 0.02 // trees equivalent
    },
    hdpe: {
        co2PerKg: 2.2,
        energyPerKg: 22,
        waterPerKg: 45,
        treesPerKg: 0.018
    },
    pp: {
        co2PerKg: 2.0,
        energyPerKg: 20,
        waterPerKg: 40,
        treesPerKg: 0.016
    },
    paper: {
        co2PerKg: 1.2,
        energyPerKg: 15,
        waterPerKg: 30,
        treesPerKg: 0.08  // Higher because paper recycling saves trees directly
    },
    aluminum: {
        co2PerKg: 12.0,
        energyPerKg: 95,
        waterPerKg: 15,
        treesPerKg: 0.1
    },
    steel: {
        co2PerKg: 2.8,
        energyPerKg: 35,
        waterPerKg: 20,
        treesPerKg: 0.025
    },
    copper: {
        co2PerKg: 3.5,
        energyPerKg: 45,
        waterPerKg: 25,
        treesPerKg: 0.03
    },
    glass: {
        co2PerKg: 0.8,
        energyPerKg: 12,
        waterPerKg: 10,
        treesPerKg: 0.01
    },
    electronics: {
        co2PerKg: 4.0,
        energyPerKg: 50,
        waterPerKg: 35,
        treesPerKg: 0.035
    },
    textile: {
        co2PerKg: 1.5,
        energyPerKg: 18,
        waterPerKg: 60,  // Textile production is water-intensive
        treesPerKg: 0.015
    }
};

// Calculate Carbon Savings
function calculateCarbonSavings() {
    const materialType = document.getElementById('materialType').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    
    if (!quantity || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const data = carbonData[materialType];
    
    // Calculate savings
    const co2Saved = (data.co2PerKg * quantity).toFixed(2);
    const energySaved = (data.energyPerKg * quantity).toFixed(1);
    const waterSaved = (data.waterPerKg * quantity).toFixed(0);
    const treesSaved = (data.treesPerKg * quantity).toFixed(2);
    
    // Update results display
    document.getElementById('co2Saved').textContent = `${co2Saved} kg`;
    document.getElementById('energySaved').textContent = `${energySaved} kWh`;
    document.getElementById('waterSaved').textContent = `${waterSaved} L`;
    document.getElementById('treesSaved').textContent = treesSaved;
    
    // Calculate comparisons
    const carsEquivalent = (co2Saved / 4.6).toFixed(1); // Average car emits 4.6kg CO2 per day
    const homesEquivalent = (energySaved / 30).toFixed(1); // Average home uses 30 kWh per day
    const phonesEquivalent = (energySaved / 0.012).toFixed(0); // Phone charge uses ~0.012 kWh
    
    document.getElementById('carComparison').textContent = 
        `Taking ${carsEquivalent} cars off the road for a day`;
    document.getElementById('lightbulbComparison').textContent = 
        `Powering ${homesEquivalent} homes for a day`;
    document.getElementById('phoneComparison').textContent = 
        `Charging ${phonesEquivalent} smartphones`;
    
    // Show results
    document.getElementById('carbonResults').style.display = 'block';
    
    // Save to user's environmental impact
    saveUserImpact(materialType, quantity, co2Saved);
}

// Save user's environmental impact
function saveUserImpact(material, quantity, co2Saved) {
    if (!currentUser) return;
    
    const recyclerData = JSON.parse(localStorage.getItem('recycler_data') || '{}');
    const userData = recyclerData[currentUser.email] || {};
    
    if (!userData.environmentalImpact) {
        userData.environmentalImpact = {
            totalCO2Saved: 0,
            totalMaterialsRecycled: 0,
            materials: {}
        };
    }
    
    // Update totals
    userData.environmentalImpact.totalCO2Saved += parseFloat(co2Saved);
    userData.environmentalImpact.totalMaterialsRecycled += quantity;
    
    // Update material-specific data
    if (!userData.environmentalImpact.materials[material]) {
        userData.environmentalImpact.materials[material] = {
            quantity: 0,
            co2Saved: 0
        };
    }
    
    userData.environmentalImpact.materials[material].quantity += quantity;
    userData.environmentalImpact.materials[material].co2Saved += parseFloat(co2Saved);
    
    recyclerData[currentUser.email] = userData;
    localStorage.setItem('recycler_data', JSON.stringify(recyclerData));
    
    // Update user's eco-score
    updateEcoScore(userData.environmentalImpact);
}

// Update user's eco-score
function updateEcoScore(impact) {
    const ecoScore = Math.min(1000, Math.floor(impact.totalCO2Saved * 10));
    
    // You can display this score in user profile
    console.log(`Eco Score Updated: ${ecoScore}`);
    return ecoScore;
}

// Share Results
function shareCarbonResults() {
    const material = document.getElementById('materialType').options[document.getElementById('materialType').selectedIndex].text;
    const quantity = document.getElementById('quantity').value;
    const co2Saved = document.getElementById('co2Saved').textContent;
    
    const shareText = `🌱 I just saved ${co2Saved} of CO2 by recycling ${quantity}kg of ${material} on LOOPCART! Join me in making our planet greener. #RecycleWithLOOPCART`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Environmental Impact',
            text: shareText,
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Impact results copied to clipboard!');
        });
    }
}

// Certificate Functions
function generateCertificate() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    
    const material = document.getElementById('materialType').options[document.getElementById('materialType').selectedIndex].text;
    const quantity = document.getElementById('quantity').value;
    const co2Saved = document.getElementById('co2Saved').textContent;
    
    document.getElementById('certificateUserName').textContent = currentUser.name;
    document.getElementById('certMaterial').textContent = `${quantity} kg of ${material}`;
    document.getElementById('certCO2').textContent = `Reducing ${co2Saved} CO₂ emissions`;
    document.getElementById('certDate').textContent = `on ${new Date().toLocaleDateString()}`;
    
    document.getElementById('certificateModal').style.display = 'block';
}

function closeCertificate() {
    document.getElementById('certificateModal').style.display = 'none';
}

function downloadCertificate() {
    // Simple certificate download (for demo)
    const certificateData = {
        name: currentUser.name,
        material: document.getElementById('certMaterial').textContent,
        co2: document.getElementById('certCO2').textContent,
        date: document.getElementById('certDate').textContent
    };
    
    const blob = new Blob([JSON.stringify(certificateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOOPCART-Eco-Certificate-${currentUser.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Auto-calculate when product is viewed
function autoCalculateProductImpact(product) {
    if (product && product.weight) {
        const weight = parseFloat(product.weight);
        if (weight && !isNaN(weight)) {
            document.getElementById('quantity').value = weight;
            
            // Set material type based on product category
            const categoryMap = {
                'plastic': 'plastic',
                'metal': 'aluminum',
                'paper': 'paper',
                'electronics': 'electronics',
                'glass': 'glass',
                'textile': 'textile'
            };
            
            const material = categoryMap[product.category.toLowerCase()] || 'plastic';
            document.getElementById('materialType').value = material;
            
            // Auto-calculate after a short delay
            setTimeout(() => calculateCarbonSavings(), 500);
        }
    }
}

// Call this when opening product detail
function openProductDetail(product) {
    // ... your existing code ...
    
    // Add auto carbon calculation
    setTimeout(() => autoCalculateProductImpact(product), 1000);
}