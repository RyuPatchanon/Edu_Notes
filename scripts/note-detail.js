const getNoteIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
};

const loadNoteDetails = async () => {
    const noteId = getNoteIdFromUrl();
    if (!noteId) return;

    const res = await fetch(`${API_BASE_URL}/notes/${noteId}`);
    const note = await res.json();

    document.getElementById('note-title').textContent = note.title;
    document.getElementById('course-name').textContent = note.course_name;
    document.getElementById('tags').textContent = note.tags;
    document.getElementById('avg-rating').textContent = note.avg_rating || 'N/A';
    document.getElementById('description').textContent = note.description;
    document.getElementById('download-link').href = note.file_url;
    document.getElementById('download-link').target = '_blank';

    loadReviews(noteId);
};

const loadReviews = async (noteId) => {
    const res = await fetch(`${API_BASE_URL}/notes/${noteId}/reviews`);
    const reviews = await res.json();
    const container = document.getElementById('reviews-container');
    container.innerHTML = '';

    reviews.forEach(review => {
        const div = document.createElement('div');
        div.classList.add('review');
    
        div.innerHTML = `
            <p class="review-content">${review.content}</p>
            <textarea class="edit-review-content" style="display:none;">${review.content}</textarea>
            <p><strong>Rating:</strong> <span class="review-rating">${review.rating}</span></p>
            <input type="number" class="edit-review-rating" min="1" max="5" value="${review.rating}" style="display:none;" />
            <button class="edit-review-btn">Edit</button>
            <button class="save-review-btn" style="display:none;">Save</button>
            <hr>
        `;
    
        container.appendChild(div);
    
        const editBtn = div.querySelector('.edit-review-btn');
        const saveBtn = div.querySelector('.save-review-btn');
        const contentP = div.querySelector('.review-content');
        const ratingSpan = div.querySelector('.review-rating');
        const editContent = div.querySelector('.edit-review-content');
        const editRating = div.querySelector('.edit-review-rating');
    
        editBtn.addEventListener('click', () => {
            contentP.style.display = 'none';
            ratingSpan.style.display = 'none';
            editContent.style.display = 'block';
            editRating.style.display = 'inline';
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline';
        });
    
        saveBtn.addEventListener('click', async () => {
            const updatedContent = editContent.value;
            const updatedRating = parseInt(editRating.value);
    
            try {
                const res = await fetch(`${API_BASE_URL}/reviews/${review.review_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: updatedContent, rating: updatedRating })
                });
    
                if (res.ok) {
                    contentP.textContent = updatedContent;
                    ratingSpan.textContent = updatedRating;
                    contentP.style.display = 'block';
                    ratingSpan.style.display = 'inline';
                    editContent.style.display = 'none';
                    editRating.style.display = 'none';
                    editBtn.style.display = 'inline';
                    saveBtn.style.display = 'none';
                } else {
                    alert('Failed to update review.');
                }
            } catch (err) {
                console.error('Error updating review:', err);
                alert('An error occurred.');
            }
        });
    });    

    // Add click event listeners to delete buttons
    document.querySelectorAll('.delete-review-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const reviewId = button.getAttribute('data-id');
            if (!confirm('Are you sure you want to delete this review?')) return;

            try {
                const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    alert('Review deleted successfully.');
                    loadReviews(noteId);
                } else {
                    alert('Failed to delete review.');
                }
            } catch (err) {
                console.error('Error deleting review:', err);
                alert('An error occurred while deleting the review.');
            }
        });
    });
};

document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const noteId = getNoteIdFromUrl();
    const content = document.getElementById('review-content').value.trim();
    const rating = parseInt(document.getElementById('review-rating').value);

    if (!content || rating < 1 || rating > 5) {
        alert('Please enter a valid review and rating (1–5).');
        return;
    }

    await fetch(`${API_BASE_URL}/notes/${noteId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, rating })
    });

    document.getElementById('review-form').reset();
    loadReviews(noteId);
});

loadNoteDetails();
document.getElementById('delete-btn').addEventListener('click', async () => {
    const noteId = getNoteIdFromUrl();

    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert('Note deleted successfully.');
            window.location.href = 'index.html'; // redirect to homepage
        } else {
            alert('Failed to delete note.');
        }
    } catch (err) {
        console.error('Error deleting note:', err);
        alert('An error occurred while deleting the note.');
    }
});

document.getElementById('edit-description-btn').addEventListener('click', () => {
    const descriptionText = document.getElementById('description').textContent;
    document.getElementById('description-edit').value = descriptionText;
    document.getElementById('description').style.display = 'none';
    document.getElementById('description-edit').style.display = 'block';
    document.getElementById('edit-description-btn').style.display = 'none';
    document.getElementById('save-description-btn').style.display = 'inline';
});

document.getElementById('save-description-btn').addEventListener('click', async () => {
    const noteId = getNoteIdFromUrl();
    const newDescription = document.getElementById('description-edit').value;

    try {
        const res = await fetch(`${API_BASE_URL}/notes/${noteId}/description`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: newDescription })
        });

        if (res.ok) {
            document.getElementById('description').textContent = newDescription;
            document.getElementById('description').style.display = 'block';
            document.getElementById('description-edit').style.display = 'none';
            document.getElementById('edit-description-btn').style.display = 'inline';
            document.getElementById('save-description-btn').style.display = 'none';
        } else {
            alert('Failed to update description.');
        }
    } catch (err) {
        console.error('Error updating description:', err);
        alert('An error occurred.');
    }
});
