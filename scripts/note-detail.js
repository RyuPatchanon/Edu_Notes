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
            <p>${review.content}</p>
            <p><strong>Rating:</strong> ${review.rating}</p>
            <button class="delete-review-btn" data-id="${review.review_id}">Delete Review</button>
            <hr>
        `;
        container.appendChild(div);
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
