// note-detail.js manages the display and interaction on the note detail page.
// It fetches note data, reviews, and handles user actions like adding/editing/deleting reviews and notes.

// Retrieves the note ID from the URL query parameters.
const getNoteIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search); // Creates a URLSearchParams object from the current URL's query string.
    return params.get('id'); // Returns the value of the 'id' parameter, or null if not found.
};

// Fetches and displays the main details of a specific note.
const loadNoteDetails = async () => {
    const noteId = getNoteIdFromUrl(); // Gets the current note's ID.
    if (!noteId) { // If no noteId is found in the URL, stop execution.
        console.error("Note ID not found in URL.");
        // Optionally, redirect or display an error message to the user.
        return;
    }

    try {
        // Asynchronously fetches the specific note's data from the API.
        const res = await fetch(`${API_BASE_URL}/notes/${noteId}`);
        if (!res.ok) { // Checks if the HTTP response status is not OK (e.g., 404, 500).
            throw new Error(`Failed to fetch note details: ${res.status}`);
        }
        const note = await res.json(); // Parses the JSON response.
        
        document.getElementById('note-title').textContent = note.title;
        document.getElementById('course-name').textContent = note.course_name;
        document.getElementById('tags').textContent = note.tags; // Assumes tags is a string; if an array, might need .join(', ').
        document.getElementById('avg-rating').textContent = note.avg_rating || 'N/A'; // Uses 'N/A' if avg_rating is null or undefined.
        document.getElementById('description').textContent = note.description;
        const downloadLink = document.getElementById('download-link');
        if (downloadLink) { // Check if the download link element exists
            downloadLink.href = note.file_url;
            downloadLink.target = '_blank'; // Opens the link in a new tab.
        }

        loadReviews(noteId); // After loading note details, load its associated reviews.
    } catch (error) {
        console.error('Error loading note details:', error);
        // Display an error message to the user in the UI.
        const noteContainer = document.querySelector('.container'); // Or a more specific error placeholder
        if (noteContainer) {
            noteContainer.innerHTML = '<p>Error loading note details. Please try again later.</p>';
        }
    }
};

// Fetches and displays reviews for a given note, including functionality for editing and deleting reviews.
const loadReviews = async (noteId) => {
    try {
        // Asynchronously fetches reviews for the specified noteId.
        const res = await fetch(`${API_BASE_URL}/notes/${noteId}/reviews`);
        if (!res.ok) {
            throw new Error(`Failed to fetch reviews: ${res.status}`);
        }
        const reviews = await res.json(); // Parses the JSON response.
        const container = document.getElementById('reviews-container');
        if (!container) {
            console.error("Reviews container not found.");
            return;
        }
        container.innerHTML = ''; // Clears any existing reviews from the container.

        if (reviews.length === 0) {
            container.innerHTML = '<p>No reviews yet. Be the first to add one!</p>';
            // The delete review button logic below this might not find any buttons if this is the case.
        } else {
            reviews.forEach(review => {
                const div = document.createElement('div'); // Creates a new <div> for each review.
                div.classList.add('review'); // Adds a CSS class for styling.
                // Sets the inner HTML for the review, including display elements and hidden edit fields.
                div.innerHTML = `
                    <p class="review-content">${review.content}</p>
                    <textarea class="edit-review-content" style="display:none;">${review.content}</textarea>
                    <p><strong>Rating:</strong> <span class="review-rating">${review.rating}</span></p>
                    <input type="number" class="edit-review-rating" min="1" max="5" value="${review.rating}" style="display:none;" />
                    <button class="edit-review-btn">Edit</button>
                    <button class="save-review-btn" style="display:none;">Save</button>
                    <!-- Consider adding a delete button here if it's per review: -->
                    <!-- <button class="delete-review-btn" data-review-id="${review.review_id}">Delete</button> -->
                    <hr>
                `;
        
                container.appendChild(div); // Appends the new review div to the container.
        
                // Selects elements within the newly created review div for event handling.
                const editBtn = div.querySelector('.edit-review-btn');
                const saveBtn = div.querySelector('.save-review-btn');
                const contentP = div.querySelector('.review-content');
                const ratingSpan = div.querySelector('.review-rating');
                const editContent = div.querySelector('.edit-review-content');
                const editRating = div.querySelector('.edit-review-rating');
        
                // Event listener for the 'Edit' button of a review.
                editBtn.addEventListener('click', () => {
                    // Toggles visibility to show edit fields and hide display elements.
                    contentP.style.display = 'none';
                    ratingSpan.parentElement.style.display = 'none'; // Hide the whole "Rating: X" paragraph
                    editContent.style.display = 'block';
                    editRating.style.display = 'inline';
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'inline';
                });
        
                // Event listener for the 'Save' button of a review.
                saveBtn.addEventListener('click', async () => {
                    const updatedContent = editContent.value.trim();
                    const updatedRating = parseInt(editRating.value);
        
                    // Basic validation for updated review.
                    if (!updatedContent || isNaN(updatedRating) || updatedRating < 1 || updatedRating > 5) {
                        alert('Please enter valid content and a rating between 1 and 5.');
                        return;
                    }
        
                    try {
                        // Sends a PUT request to update the review on the server.
                        const updateRes = await fetch(`${API_BASE_URL}/reviews/${review.review_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: updatedContent, rating: updatedRating })
                        });
        
                        if (updateRes.ok) {
                            // Updates the displayed content and rating.
                            contentP.textContent = updatedContent;
                            ratingSpan.textContent = updatedRating;
                            // Toggles visibility back to display mode.
                            contentP.style.display = 'block';
                            ratingSpan.parentElement.style.display = 'block';
                            editContent.style.display = 'none';
                            editRating.style.display = 'none';
                            editBtn.style.display = 'inline';
                            saveBtn.style.display = 'none';
                        } else {
                            const errorData = await updateRes.json().catch(() => null);
                            alert(`Failed to update review: ${errorData?.message || updateRes.statusText}`);
                        }
                    } catch (err) {
                        console.error('Error updating review:', err);
                        alert('An error occurred while updating the review.');
                    }
                });
            });    
        }

        // Event listener for the delete review buttons.
        document.querySelectorAll('.delete-review-btn').forEach(button => {
            button.addEventListener('click', async () => {
                // The 'data-id' attribute should ideally be 'data-review-id' for clarity if it's on the button itself.
                const reviewIdToDelete = button.getAttribute('data-id') || button.closest('.review')?.dataset.reviewId; // Example of getting ID
                if (!reviewIdToDelete) {
                    console.error("Could not find review ID for deletion.");
                    alert("Error: Could not identify review to delete.");
                    return;
                }

                if (!confirm('Are you sure you want to delete this review?')) return; // User confirmation.

                try {
                    // Sends a DELETE request to remove the review.
                    const deleteRes = await fetch(`${API_BASE_URL}/reviews/${reviewIdToDelete}`, {
                        method: 'DELETE'
                    });

                    if (deleteRes.ok) {
                        alert('Review deleted successfully.');
                        loadReviews(noteId); // Reloads the reviews list to reflect the deletion.
                    } else {
                        const errorData = await deleteRes.json().catch(() => null);
                        alert(`Failed to delete review: ${errorData?.message || deleteRes.statusText}`);
                    }
                } catch (err) {
                    console.error('Error deleting review:', err);
                    alert('An error occurred while deleting the review.');
                }
            });
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
        const container = document.getElementById('reviews-container');
        if (container) {
            container.innerHTML = '<p>Error loading reviews. Please try again later.</p>';
        }
    }
};

// Event listener for submitting the new review form.
const reviewForm = document.getElementById('review-form');
if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevents the default form submission (page reload).

        const noteId = getNoteIdFromUrl();
        if (!noteId) {
            alert("Error: Note ID is missing. Cannot submit review.");
            return;
        }
        const content = document.getElementById('review-content').value.trim();
        const ratingInput = document.getElementById('review-rating').value;
        const rating = parseInt(ratingInput);

        // Validates the review content and rating.
        if (!content || isNaN(rating) || rating < 1 || rating > 5) {
            alert('Please enter a valid review and rating (1–5).');
            return;
        }

        try {
            // Sends a POST request to add the new review.
            const res = await fetch(`${API_BASE_URL}/notes/${noteId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, rating })
            });

            if (res.ok) {
                document.getElementById('review-form').reset(); // Resets the form fields.
                loadReviews(noteId); // Reloads the reviews to display the newly added one.
            } else {
                const errorData = await res.json().catch(() => null);
                alert(`Failed to submit review: ${errorData?.message || res.statusText}`);
            }
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("An error occurred while submitting your review.");
        }
    });
}


// Event listener for the main "Delete Note" button.
const deleteNoteBtn = document.getElementById('delete-btn');
if (deleteNoteBtn) { // Checks if the button exists before adding the event listener.
    deleteNoteBtn.addEventListener('click', async () => {
        const noteId = getNoteIdFromUrl();
        if (!noteId) {
            alert("Error: Note ID is missing. Cannot delete note.");
            return;
        }

        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) return; // User confirmation.

        try {
            // Sends a DELETE request to remove the entire note.
            const res = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
                method: 'DELETE'
            });

            if (res.ok) { // Checks if the response is OK
                alert('Note deleted successfully.');
                window.location.href = 'index.html'; // Redirects to the homepage after deletion.
            } else {
                const errorData = await res.json().catch(() => null);
                alert(`Failed to delete note: ${errorData?.message || res.statusText}`);
            }
        } catch (err) {
            console.error('Error deleting note:', err);
            alert('An error occurred while deleting the note.');
        }
    });
}

// Event listener for the "Edit Description" button.
const editDescriptionBtn = document.getElementById('edit-description-btn');
if (editDescriptionBtn) { // Checks if the button exists before adding the event listener.
    editDescriptionBtn.addEventListener('click', () => {
        const descriptionP = document.getElementById('description');
        const descriptionEditArea = document.getElementById('description-edit');
        const saveDescriptionBtn = document.getElementById('save-description-btn');

        if (descriptionP && descriptionEditArea && saveDescriptionBtn) { // Checks if the elements exist before proceeding.
            descriptionEditArea.value = descriptionP.textContent; // Pre-fills textarea with current description.
            descriptionP.style.display = 'none';        // Hides the paragraph display.
            descriptionEditArea.style.display = 'block'; // Shows the textarea for editing.
            editDescriptionBtn.style.display = 'none';   // Hides the "Edit" button.
            saveDescriptionBtn.style.display = 'inline'; // Shows the "Save" button.
        } else {
            console.error("One or more description elements not found for editing.");
        }
    });
}

// Event listener for the "Save Description" button.
const saveDescriptionBtn = document.getElementById('save-description-btn');
if (saveDescriptionBtn) { // Checks if the button exists before adding the event listener.
    saveDescriptionBtn.addEventListener('click', async () => {
        const noteId = getNoteIdFromUrl();
        if (!noteId) { // Checks if the note ID is available in the URL.
            alert("Error: Note ID is missing. Cannot save description.");
            return;
        }
        const newDescription = document.getElementById('description-edit').value.trim();
        const descriptionP = document.getElementById('description');
        const descriptionEditArea = document.getElementById('description-edit');
        const currentEditDescriptionBtn = document.getElementById('edit-description-btn'); // Renamed to avoid conflict

        try {
            // Sends a PUT request to update the note's description.
            const res = await fetch(`${API_BASE_URL}/notes/${noteId}/description`, { // Specific endpoint for description.
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: newDescription })
            });

            if (res.ok) { // Checks if the response is OK
                if (descriptionP && descriptionEditArea && currentEditDescriptionBtn && saveDescriptionBtn) {
                    descriptionP.textContent = newDescription; // Updates the displayed description.
                    // Toggles visibility back to display mode.
                    descriptionP.style.display = 'block';
                    descriptionEditArea.style.display = 'none';
                    currentEditDescriptionBtn.style.display = 'inline';
                    saveDescriptionBtn.style.display = 'none';
                }
            } else { // Handles the case where the update fails
                const errorData = await res.json().catch(() => null);
                alert(`Failed to update description: ${errorData?.message || res.statusText}`);
            }
        } catch (err) { // Handles any errors that occur during the fetch operation.
            console.error('Error updating description:', err);
            alert('An error occurred while updating the description.');
        }
    });
}

// Initial call to load note details and reviews when the page loads.
document.addEventListener('DOMContentLoaded', () => {
    loadNoteDetails(); // Fetches and displays the note details.
});