/**
 * URL sharing utilities for PathView
 * Handles encoding and decoding graph data in URLs
 */

/**
 * Encode graph data to a base64 URL parameter
 * @param {Object} graphData - The complete graph data object
 * @returns {string} - Base64 encoded string
 */
export function encodeGraphData(graphData) {
    try {
        const jsonString = JSON.stringify(graphData);
        // Use btoa for base64 encoding, but handle Unicode strings properly
        const utf8Bytes = new TextEncoder().encode(jsonString);
        const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
        return btoa(binaryString);
    } catch (error) {
        console.error('Error encoding graph data:', error);
        return null;
    }
}

/**
 * Decode graph data from a base64 URL parameter
 * @param {string} encodedData - Base64 encoded graph data
 * @returns {Object|null} - Decoded graph data object or null if error
 */
export function decodeGraphData(encodedData) {
    try {
        // Decode base64 and handle Unicode properly
        const binaryString = atob(encodedData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const jsonString = new TextDecoder().decode(bytes);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error decoding graph data:', error);
        return null;
    }
}

/**
 * Generate a shareable URL with the current graph data
 * @param {Object} graphData - The complete graph data object
 * @returns {string} - Complete shareable URL
 */
export function generateShareableURL(graphData) {
    try {
        const encodedData = encodeGraphData(graphData);
        if (!encodedData) {
            throw new Error('Failed to encode graph data');
        }

        const baseURL = window.location.origin + window.location.pathname;
        const url = new URL(baseURL);
        url.searchParams.set('graph', encodedData);

        return url.toString();
    } catch (error) {
        console.error('Error generating shareable URL:', error);
        return null;
    }
}

/**
 * Extract graph data from current URL parameters
 * @returns {Object|null} - Graph data object or null if not found/error
 */
export function getGraphDataFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedData = urlParams.get('graph');

        if (!encodedData) {
            return null;
        }

        return decodeGraphData(encodedData);
    } catch (error) {
        console.error('Error extracting graph data from URL:', error);
        return null;
    }
}

/**
 * Update the current URL with graph data without page reload
 * @param {Object} graphData - The complete graph data object
 * @param {boolean} replaceState - Whether to replace current history state (default: false)
 */
export function updateURLWithGraphData(graphData, replaceState = false) {
    try {
        const shareableURL = generateShareableURL(graphData);
        if (shareableURL) {
            if (replaceState) {
                window.history.replaceState({}, '', shareableURL);
            } else {
                window.history.pushState({}, '', shareableURL);
            }
        }
    } catch (error) {
        console.error('Error updating URL with graph data:', error);
    }
}

/**
 * Clear graph data from URL without page reload
 */
export function clearGraphDataFromURL() {
    try {
        const baseURL = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', baseURL);
    } catch (error) {
        console.error('Error clearing graph data from URL:', error);
    }
}
