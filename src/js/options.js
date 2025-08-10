// AI Cloudy Calculator Options - Manifest V3 compatible
class OptionsManager {
    constructor() {
        this.defaultOptions = {
            zoom: '1.0',
            height: '400',
            width: '450',
            titleFont: 'Arial, sans-serif',
            headerLinksFont: 'Arial, sans-serif',
            resultFont: 'monospace',
            inputFont: 'monospace',
            quickKeyOn: false,
            localGoogleOn: false,
            localGoogleUrl: 'https://www.google.com',
            // aiEnabled: false,
            // openRouterApiKey: ''
        };
        
        this.init();
    }
    
    init() {
        this.loadOptions();
        this.setupEventListeners();
    }
    
    async loadOptions() {
        try {
            // Load from chrome.storage
            const result = await chrome.storage.local.get(Object.keys(this.defaultOptions));
            
            for (const [key, defaultValue] of Object.entries(this.defaultOptions)) {
                const element = document.getElementById(key);
                if (!element) continue;
                
                const value = result[key] !== undefined ? result[key] : defaultValue;
                
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
                    }
        // Options loaded from storage
        } catch (error) {
            // Error loading options - use defaults
            this.loadDefaults();
        }
    }
    
    loadDefaults() {
        for (const [key, defaultValue] of Object.entries(this.defaultOptions)) {
            const element = document.getElementById(key);
            if (!element) continue;
            
            if (element.type === 'checkbox') {
                element.checked = defaultValue;
            } else {
                element.value = defaultValue;
            }
        }
        // Loaded default options
    }
    
    async saveOption(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
            
            // Apply the change immediately
            this.applyOption(key, value);
        } catch (error) {
            // Error saving option - ignore silently
        }
    }
    
    applyOption(key, value) {
        // Apply visual changes based on the option
        switch (key) {
            case 'zoom':
                document.body.style.zoom = value;
                break;
            case 'titleFont':
                const titleElements = document.querySelectorAll('#chromeyCalcName, h1');
                titleElements.forEach(el => el.style.fontFamily = value);
                break;
            case 'headerLinksFont':
                const linkElements = document.querySelectorAll('.headerLink, a');
                linkElements.forEach(el => el.style.fontFamily = value);
                break;
            case 'resultFont':
                const resultElements = document.querySelectorAll('#calcResults, .result-value');
                resultElements.forEach(el => el.style.fontFamily = value);
                break;
            case 'inputFont':
                const inputElements = document.querySelectorAll('#calcInput, input[type="text"]');
                inputElements.forEach(el => el.style.fontFamily = value);
                break;
        }
    }
    
    setupEventListeners() {
        // Handle input changes
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            const handler = () => {
                const value = input.type === 'checkbox' ? input.checked : input.value;
                this.saveOption(input.id, value);
            };
            
            input.addEventListener('change', handler);
            input.addEventListener('blur', handler);
            input.addEventListener('keyup', handler);
        });
        
        // Handle reset buttons
        const resetButtons = document.querySelectorAll('.reset');
        resetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const row = button.closest('tr');
                const input = row.querySelector('input');
                if (input && this.defaultOptions[input.id] !== undefined) {
                    const defaultValue = this.defaultOptions[input.id];
                    
                    if (input.type === 'checkbox') {
                        input.checked = defaultValue;
                    } else {
                        input.value = defaultValue;
                    }
                    
                    this.saveOption(input.id, defaultValue);
                    input.focus();
                    // Reset option to default value
                }
            });
        });
        
        // Event listeners set up
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new OptionsManager());
} else {
    new OptionsManager();
}