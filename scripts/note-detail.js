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
            <hr>
        `;
        container.appendChild(div);
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