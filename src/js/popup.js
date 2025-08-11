// Cloudy Calculator - Safe parser without eval/Function

/*
// AI-assisted error resolution system
class AIErrorResolver {
    constructor() {
        // Get your free API key from https://openrouter.ai/keys
        this.openRouterApiKey = ' '; 
        this.modelName = 'deepseek/deepseek-chat-v3-0324:free';
        this.enabled = false;
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const config = await chrome.storage.local.get(['aiEnabled', 'openRouterApiKey']);
            this.enabled = config.aiEnabled === true;
            this.openRouterApiKey = config.openRouterApiKey || '';
            console.log('AI Debug - Loaded config:', { enabled: this.enabled, apiKey: this.openRouterApiKey ? 'SET' : 'NOT SET' });
        } catch (error) {
            console.log('AI Debug - Error loading config:', error);
            this.enabled = false;
            this.openRouterApiKey = '';
        }
    }

    // Get context for the AI model
    getContext(variables, history) {

        const recentHistory = history.slice(-10); // Last 10 inputs
        let context = "You are a calculator assistant. Answer questions and solve calculations. For natural language questions, provide concise answers with units. For calculations, provide only the numerical result. Keep responses under 8 words when possible. For unsolvable problems, respond 'Unable to solve'.\n\n";
        
        if (Object.keys(variables).length > 1) { // More than just '@'
            context += "Variables: " + JSON.stringify(variables) + "\n";
        }
        
        if (recentHistory.length > 0) {
            context += "Recent calculations: " + recentHistory.join(", ") + "\n";
        }
        
        context += "\nSolve: ";
        return context;
    }

    // Query OpenRouter AI model
    async queryAI(query, variables, history) {
        // Check if AI is enabled and API key is set
        console.log('AI Debug - enabled:', this.enabled, 'apiKey:', this.openRouterApiKey ? 'SET' : 'NOT SET');
        if (!this.enabled || !this.openRouterApiKey) {
            console.log('AI Debug - AI disabled or no API key');
            return 'Unable to solve';
        }

        try {
            const context = this.getContext(variables, history);
            const prompt = context + query;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/cloudy-calculator',
                    'X-Title': 'Cloudy Calculator'
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 50,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const result = data.choices?.[0]?.message?.content?.trim();
            
            // Validate response length and content
            if (!result || result.toLowerCase().includes('unable to solve')) {
                return 'Unable to solve';
            }
            
            // Check if response is too long (more than 8 words)
            const wordCount = result.split(/\s+/).length;
            if (wordCount > 8) {
                return result.split(/\s+/).slice(0, 8).join(' ');
            }
            
            return result;
        } catch (error) {
            // AI query failed - return fallback
            console.log('AI Debug - API call failed:', error);
            return 'Unable to solve';
        }
    }
}
*/

class CloudyCalculator {
    constructor() {
        this.history = [];
        this.historyIndex = -1;
        this.variables = { '@': 0 }; // @ is the last result
        // this.aiResolver = new AIErrorResolver();
        this.init();
    }

    async init() {
        this.calcInput = document.getElementById('calcInput');
        this.calcResults = document.getElementById('calcResults');
        this.calcResultsWrapper = document.getElementById('calcResultsWrapper');
        
        // These elements should always exist, otherwise the calculator is broken
        
        await this.loadAndApplyOptions();
        this.setupEventListeners();
        this.loadState();
        
        // Enhanced focus implementation
        this.ensureFocus();
    }

    // New method: Robust focus implementation
    ensureFocus() {
        // Immediate focus attempt
        this.focusInput();
        
        // Delayed focus attempts in case the first one fails
        setTimeout(() => this.focusInput(), 100);
        setTimeout(() => this.focusInput(), 300);
        
        // Focus when the window becomes visible (for popup reopening)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.focusInput();
            }
        });
        
        // Focus when the window gains focus
        window.addEventListener('focus', () => {
            this.focusInput();
        });
    }

    // Helper method to focus the input with error handling
    focusInput() {
        try {
            if (this.calcInput && document.activeElement !== this.calcInput) {
                this.calcInput.focus();
                // Move cursor to end of input if there's text
                if (this.calcInput.value) {
                    this.calcInput.setSelectionRange(this.calcInput.value.length, this.calcInput.value.length);
                }
            }
        } catch (error) {
            // Focus attempt failed - ignore silently
        }
    }

    async loadAndApplyOptions() {
        try {
            const options = await chrome.storage.local.get([
                'zoom', 'height', 'width', 'titleFont', 'headerLinksFont', 'resultFont', 'inputFont'
            ]);
            
            // ===== Apply size options (width & height) =====
            const calcWrapper = document.getElementById('calcWrapper');
            if (calcWrapper) {
                // Width
                if (options.width) {
                    let w = options.width.toString();
                    if (!w.endsWith('px')) w += 'px';
                    calcWrapper.style.width = w;
                    // Also set body width so Chrome resizes the popup correctly
                    document.body.style.width = w;
                }
                // Height
                if (options.height) {
                    let h = options.height.toString();
                    if (!h.endsWith('px')) h += 'px';
                    calcWrapper.style.height = h;
                    document.body.style.height = h;
                }
            }
            
            if (options.zoom) {
                document.body.style.zoom = options.zoom;
            }
            
            if (options.titleFont) {
                const titleElements = document.querySelectorAll('#chromeyCalcName');
                titleElements.forEach(el => el.style.fontFamily = options.titleFont);
            }
            
            if (options.headerLinksFont) {
                const linkElements = document.querySelectorAll('.headerLink');
                linkElements.forEach(el => el.style.fontFamily = options.headerLinksFont);
            }
            
            if (options.resultFont) {
                const resultElements = document.querySelectorAll('#calcResults, #calcResults *');
                resultElements.forEach(el => el.style.fontFamily = options.resultFont);
            }
            
            if (options.inputFont) {
                const inputElements = document.querySelectorAll('#calcInput');
                inputElements.forEach(el => el.style.fontFamily = options.inputFont);
            }
            
        } catch (error) {
            // Could not load options - use defaults
        }
    }

    setupEventListeners() {
        // Main input handler
        this.calcInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                await this.processInput();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });

        // Clear button - now clears everything
        const clearButton = document.getElementById('clearAll');
        if (clearButton) {
            clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAll();
                // Refocus after clearing
                setTimeout(() => this.focusInput(), 50);
            });
        }

        // Pop-out button
        const popOutButton = document.getElementById('popOut');
        if (popOutButton) {
            popOutButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.openPopout();
            });
        }

        // Click on results to insert them
        this.calcResults.addEventListener('click', (e) => {
            if (e.target.classList.contains('result-value')) {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Click to copy to clipboard
                    this.copyToClipboard(e.target.dataset.value || e.target.textContent.replace(/.*= /, ''));
                    this.showCopyFeedback(e.target);
                } else {
                    // Regular click to insert
                    const value = e.target.dataset.value || e.target.textContent.replace(/.*= /, '');
                    this.insertAtCursor(value);
                }
                // Refocus after interaction
                setTimeout(() => this.focusInput(), 50);
            }
        });

        // Save state when window closes
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        // Save state periodically (every 30 seconds)
        setInterval(() => {
            this.saveState();
        }, 30000);

        // Listen for option changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                this.loadAndApplyOptions();
                // Reload AI configuration if AI settings changed
                // if (changes.aiEnabled || changes.openRouterApiKey) {
                //     this.aiResolver.loadConfig();
                // }
            }
        });

        // Refocus when clicking anywhere in the calculator (except on interactive elements)
        document.addEventListener('click', (e) => {
            // Don't refocus if clicking on buttons, links, or input elements
            if (!e.target.matches('button, a, input, textarea, select, [contenteditable]')) {
                setTimeout(() => this.focusInput(), 10);
            }
        });
    }

    async processInput() {
        const input = this.calcInput.value.trim();
        if (!input) return;

        this.addToHistory(input);

        try {
            if (input === 'clear') {
                this.clearAll();
                this.calcInput.value = '';
                // Refocus after clearing
                setTimeout(() => this.focusInput(), 50);
                return;
            }

            // Handle variable assignments first
            if (await this.handleVariableAssignment(input)) {
                this.limitVariables();
                this.saveState();
                this.calcInput.value = '';
                this.focusInput(); // Ensure focus is maintained
                return;
            }

            // Check if this looks like a natural language question that needs AI
            // if (this.isNaturalLanguageQuestion(input)) {
            //     const response = await this.aiResolver.queryAI(input, this.variables, this.history);
            //     if (response != "Unable to solve") {
            //         this.addResult(input, '(AI) ' + response, 'ai-assisted');
            //         this.saveState();
            //         this.calcInput.value = '';
            //         this.focusInput();
            //         return;
            //     }
            // }

            // Check if this looks like natural language before parsing
            // if (this.looksLikeNaturalLanguage(input)) {
            //     const response = await this.aiResolver.queryAI(input, this.variables, this.history);
            //     if (response != "Unable to solve") {
            //         this.addResult(input, '(AI) ' + response, 'ai-assisted');
            //         this.saveState();
            //         this.calcInput.value = '';
            //         this.focusInput();
            //         return;
            //     }
            // }

            // Check if this looks like a unit conversion query before parsing
            if (this.looksLikeUnitQuery(input)) {
                const unitsResult = unitsJsCalc(input);
                if (unitsResult) {
                    this.addResult(input, unitsResult, 'units');
                    this.variables['@'] = unitsResult;
                    this.saveState();
                    this.calcInput.value = '';
                    this.focusInput();
                    return;
                }
            }

            // Substitute variables and evaluate
            let expression = this.substituteVariables(input);
            const result = this.evaluateExpression(expression);
            
            // Store result as @
            this.variables['@'] = result;
            this.addResult(input, result);
            this.saveState();

        } catch (error) {
            // If we get here, both unit conversion and main parser failed
            this.addResult(input, 'Error: ' + error.message, 'error');
            this.saveState();
        }

        this.calcInput.value = '';
        this.focusInput(); // Ensure focus is maintained after processing
    }

    async handleVariableAssignment(input) {
        // Handle = (evaluated assignment)
        const evalMatch = input.match(/^(@?\w+)\s*=\s*(.+)$/);
        if (evalMatch) {
            const [, varName, expression] = evalMatch;
            
            // Check if the expression looks like a unit conversion query
            if (this.looksLikeUnitQuery(expression)) {
                const unitsResult = unitsJsCalc(expression);
                if (unitsResult) {
                    this.variables[varName] = unitsResult;
                    this.variables['@'] = unitsResult;
                    this.addResult(input, `${varName} = ${unitsResult}`, 'units');
                    return true;
                }
            }
            
            try {
                const substituted = this.substituteVariables(expression);
                const value = this.evaluateExpression(substituted);
                this.variables[varName] = value;
                this.variables['@'] = value;
                this.addResult(input, `${varName} = ${value}`, 'variable');
                return true;
            } catch (error) {
                // If we get here, both unit conversion and main parser failed
                this.addResult(input, 'Error: ' + error.message, 'error');
                return true;
            }
        }

        return false;
    }

    // looksLikeNaturalLanguage(input) {
    //     // Check if input contains natural language indicators
    //     const naturalLanguagePatterns = [
    //         /\b(what|how|when|where|why|which|who)\b/i,
    //         /\b(distance|from|to|between|earth|moon|sun|planet|star)\b/i,
    //         /\b(convert|calculate|find|determine|compute)\b/i,
    //         /\b(temperature|speed|weight|height|length|area|volume)\b/i,
    //         /\b(celsius|fahrenheit|kelvin|miles|kilometers|meters|feet|inches)\b/i,
    //         /\b(light|year|second|minute|hour|day|week|month)\b/i,
    //         /\b(gravity|mass|density|pressure|force|energy|power)\b/i,
    //         /\b(radius|diameter|circumference|perimeter|surface|area)\b/i,
    //         /\b(volume|capacity|liquid|gas|solid)\b/i,
    //         /\b(percentage|percent|ratio|proportion|fraction)\b/i
    //     ];
    //     
    //     // Check if input has 3+ words (likely natural language)
    //     const wordCount = input.trim().split(/\s+/).length;
    //     
    //     // Check if input contains natural language patterns
    //     const hasNaturalLanguage = naturalLanguagePatterns.some(pattern => pattern.test(input));
    //     
    //     // Check if input doesn't look like a mathematical expression
    //     const hasMathOperators = /[\+\-\*\/\^\(\)\=]/.test(input);
    //     const hasNumbers = /\d/.test(input);
    //     
    //     // If it has natural language patterns and either many words or no math operators, it's likely natural language
    //     return hasNaturalLanguage && (wordCount >= 3 || !hasMathOperators);
    // }

    // isNaturalLanguageQuestion(input) {
    //     // Check if input contains natural language indicators
    //     const naturalLanguagePatterns = [
    //         /\b(what|how|when|where|why|which|who)\b/i,
    //         /\b(distance|from|to|between|earth|moon|sun|planet|star)\b/i,
    //         /\b(convert|calculate|find|determine|compute)\b/i,
    //         /\b(temperature|speed|weight|height|length|area|volume)\b/i,
    //         /\b(celsius|fahrenheit|kelvin|miles|kilometers|meters|feet|inches)\b/i,
    //         /\b(light|year|second|minute|hour|day|week|month)\b/i,
    //         /\b(gravity|mass|density|pressure|force|energy|power)\b/i,
    //         /\b(radius|diameter|circumference|perimeter|surface|area)\b/i,
    //         /\b(volume|capacity|liquid|gas|solid)\b/i,
    //         /\b(percentage|percent|ratio|proportion|fraction)\b/i
    //     ];
    //     
    //     // Check if input has 3+ words (likely natural language)
    //     const wordCount = input.trim().split(/\s+/).length;
    //     
    //     // Check if input contains natural language patterns
    //     const hasNaturalLanguage = naturalLanguagePatterns.some(pattern => pattern.test(input));
    //     
    //     // Check if input doesn't look like a mathematical expression
    //     const hasMathOperators = /[\+\-\*\/\^\(\)\=]/.test(input);
    //     const hasNumbers = /\d/.test(input);
    //     
    //     // If it has natural language patterns and either many words or no math operators, it's likely natural language
    //     return hasNaturalLanguage && (wordCount >= 3 || !hasMathOperators);
    // }

    substituteVariables(expression) {
        let expr = expression;

        // Substitute variables
        for (const [name, value] of Object.entries(this.variables)) {
            const regex = new RegExp('\\b' + name.replace(/[@$]/g, '\\$&') + '\\b', 'g');
            expr = expr.replace(regex, value.toString());
        }

        // Substitute constants
        expr = expr.replace(/\bpi\b/g, Math.PI.toString());
        expr = expr.replace(/\be\b/g, Math.E.toString());

        return expr;
    }

    evaluateExpression(expression) {
        // Safe recursive descent parser
        let expr = expression.replace(/\s/g, ''); // Remove spaces
        let pos = 0;

        function peek() {
            return pos < expr.length ? expr[pos] : null;
        }

        function consume() {
            return pos < expr.length ? expr[pos++] : null;
        }

        function parseNumber() {
            let num = '';
            while (pos < expr.length && /[0-9.]/.test(expr[pos])) {
                num += consume();
            }
            if (num === '') throw new Error('Expected number');
            return parseFloat(num);
        }

        function parseFunction() {
            let funcName = '';
            while (pos < expr.length && /[a-zA-Z]/.test(expr[pos])) {
                funcName += consume();
            }
            
            if (peek() !== '(') {
                throw new Error('Expected ( after function name');
            }
            consume(); // consume '('
            
            const arg = parseExpression();
            
            if (peek() !== ')') {
                throw new Error('Expected )');
            }
            consume(); // consume ')'
            
            switch (funcName.toLowerCase()) {
                case 'sin': return Math.sin(arg);
                case 'cos': return Math.cos(arg);
                case 'tan': return Math.tan(arg);
                case 'sqrt': return Math.sqrt(arg);
                case 'log': return Math.log10(arg);
                case 'ln': return Math.log(arg);
                case 'abs': return Math.abs(arg);
                case 'floor': return Math.floor(arg);
                case 'ceil': return Math.ceil(arg);
                case 'round': return Math.round(arg);
                default: throw new Error('Unknown function: ' + funcName);
            }
        }

        function parseFactor() {
            if (peek() === '(') {
                consume(); // consume '('
                const result = parseExpression();
                if (peek() !== ')') {
                    throw new Error('Missing closing parenthesis');
                }
                consume(); // consume ')'
                return result;
            } else if (peek() === '-') {
                consume(); // consume '-'
                return -parseFactor();
            } else if (peek() === '+') {
                consume(); // consume '+'
                return parseFactor();
            } else if (/[a-zA-Z]/.test(peek())) {
                return parseFunction();
            } else {
                return parseNumber();
            }
        }

        function parsePower() {
            let result = parseFactor();
            while (pos < expr.length && expr.substring(pos, pos + 2) === '**') {
                pos += 2; // skip '**'
                result = Math.pow(result, parseFactor());
            }
            // Handle ^ as well
            while (pos < expr.length && peek() === '^') {
                consume(); // skip '^'
                result = Math.pow(result, parseFactor());
            }
            return result;
        }

        function parseTerm() {
            let result = parsePower();
            while (pos < expr.length && /[*/]/.test(peek())) {
                const op = consume();
                const right = parsePower();
                if (op === '*') {
                    result *= right;
                } else {
                    if (right === 0) throw new Error('Division by zero');
                    result /= right;
                }
            }
            return result;
        }

        function parseExpression() {
            let result = parseTerm();
            while (pos < expr.length && /[+-]/.test(peek())) {
                const op = consume();
                const right = parseTerm();
                if (op === '+') {
                    result += right;
                } else {
                    result -= right;
                }
            }
            return result;
        }

        // Handle degrees conversion before parsing
        expr = expr.replace(/(\d+(?:\.\d+)?)degrees?/g, '($1*' + (Math.PI / 180) + ')');

        const result = parseExpression();
        if (pos < expr.length) {
            throw new Error('Unexpected character: ' + expr[pos]);
        }
        
        if (!isFinite(result)) {
            throw new Error('Result is not finite');
        }
        
        return result;
    }

    addResult(input, result, type = 'normal') {
        const li = document.createElement('li');
        li.className = 'result-item';
        
        const inputSpan = document.createElement('span');
        inputSpan.className = 'inputText';
        inputSpan.textContent = `${input} =`;
        
        const resultSpan = document.createElement('span');
        resultSpan.className = `outputText result-value ${type}`;
        resultSpan.textContent = result;
        resultSpan.style.cursor = 'pointer';
        resultSpan.dataset.value = typeof result === 'number' ? result.toString() : result;
        
        li.appendChild(inputSpan);
        li.appendChild(resultSpan);
        
        this.calcResults.appendChild(li);
        
        // Scroll to bottom
        this.calcResultsWrapper.scrollTop = this.calcResultsWrapper.scrollHeight;
        
        // Limit results to 100
        while (this.calcResults.children.length > 100) {
            this.calcResults.removeChild(this.calcResults.firstChild);
        }
    }

    addToHistory(input) {
        this.history.push(input);
        this.historyIndex = this.history.length;
        
        // Keep history limited to 100 items (existing logic)
        if (this.history.length > 100) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    navigateHistory(direction) {
        if (this.history.length === 0) return;
        
        this.historyIndex += direction;
        
        if (this.historyIndex < 0) {
            this.historyIndex = 0;
        } else if (this.historyIndex >= this.history.length) {
            this.historyIndex = this.history.length;
            this.calcInput.value = '';
            return;
        }
        
        this.calcInput.value = this.history[this.historyIndex] || '';
        
        setTimeout(() => {
            this.calcInput.selectionStart = this.calcInput.selectionEnd = this.calcInput.value.length;
        }, 0);
    }

    insertAtCursor(text) {
        const start = this.calcInput.selectionStart;
        const end = this.calcInput.selectionEnd;
        const value = this.calcInput.value;
        
        this.calcInput.value = value.substring(0, start) + text + value.substring(end);
        this.calcInput.selectionStart = this.calcInput.selectionEnd = start + text.length;
        this.calcInput.focus();
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    showCopyFeedback(element) {
        const originalOpacity = element.style.opacity;
        element.style.opacity = '0.3';
        setTimeout(() => {
            element.style.opacity = originalOpacity;
        }, 200);
    }

    clearResults() {
        this.calcResults.innerHTML = '';
    }

    // New method: Clear everything including variables and history
    clearAll() {
        this.calcResults.innerHTML = '';
        this.history = [];
        this.historyIndex = -1;
        this.variables = { '@': 0 }; // Reset to default state
        this.saveState(); // Save the cleared state
    }

    // New method: Limit variables to prevent memory bloat
    limitVariables() {
        const maxVariables = 50; // Reasonable limit for variables
        const variableNames = Object.keys(this.variables).filter(name => name !== '@');
        
        if (variableNames.length > maxVariables) {
            // Remove oldest variables (those added first)
            // Since we can't track order easily, we'll remove variables alphabetically
            // This ensures consistent behavior
            variableNames.sort();
            const toRemove = variableNames.slice(0, variableNames.length - maxVariables);
            
            toRemove.forEach(varName => {
                delete this.variables[varName];
            });
        }
    }

    openPopout() {
        // Create the pop-out window using stored width/height (fallback 500×500)
        chrome.storage.local.get(['width', 'height'], (opts) => {
            const w = opts.width ? (parseInt(opts.width) || 500) : 500;
            const h = opts.height ? (parseInt(opts.height) || 500) : 500;
            chrome.windows.create({
                url: 'calc.html',
                type: 'popup',
                width: w,
                height: h
            });
        });
    }

    saveState() {
        const state = {
            history: this.history,
            variables: this.variables,
            results: this.calcResults.innerHTML
        };
        localStorage.setItem('cloudyCalcState', JSON.stringify(state));
    }

    loadState() {
        try {
            const state = JSON.parse(localStorage.getItem('cloudyCalcState') || '{}');
            this.history = state.history || [];
            this.variables = state.variables || { '@': 0 };
            if (state.results) {
                this.calcResults.innerHTML = state.results;
            }
            this.historyIndex = this.history.length;
        } catch (e) {
            // Ignore errors loading state
        }
    }

    // Check if input looks like a unit conversion query
    looksLikeUnitQuery(input) {
        // Check for common unit patterns
        const unitPatterns = [
            // Mixed units with + or - and "in" conversions (highest priority)
            /\d+\s*[a-zA-Z\-]+\s*[+\-]\s*\d+\s*[a-zA-Z\-]+\s+in\s+[a-zA-Z\-]+/,
            // Mixed units with + or - (general case)
            /\d+\s*[a-zA-Z\-]+\s*[+\-]\s*\d+\s*[a-zA-Z\-]+/,
            // "in" conversions
            /\d+(?:\/\d+)?\s*[a-zA-Z\-]+\s+in\s+[a-zA-Z\-]+/,
            // "to" conversions (temperature, currency)
            /\d+(?:\.\d+)?\s*[CFKR]\s+to\s+[CFKR]/i,
            /\d+(?:\.\d+)?\s+[A-Z]{3}\s+to\s+[A-Z]{3}/i,
            // Number base conversions
            /.+\s+in\s+(hex|octal|binary|decimal)/i,
            // Mathematical functions
            /^[a-z]+\([^)]+\)$/i,
            // Constants
            /^[a-z\-]+$/i,
            // Simple unit expressions (like "5mi", "1/4 cup")
            /^\d+(?:\/\d+)?\s*[a-zA-Z\-]+$/,
            // Unit expressions with spaces (like "2 cups", "1 day")
            /^\d+\s+[a-zA-Z\-]+$/
        ];
        
        // Special case: if input contains both units and "in", it's definitely a unit query
        if (input.includes(' in ') && /[a-zA-Z]/.test(input)) {
            return true;
        }
        
        // Special case: if input contains mixed units with + or - and "in", it's definitely a unit query
        if (input.match(/[+\-]/) && input.includes(' in ') && /[a-zA-Z]/.test(input)) {
            return true;
        }
        
        return unitPatterns.some(pattern => pattern.test(input));
    }
}

// Initialize calculator when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CloudyCalculator());
} else {
    new CloudyCalculator();
}