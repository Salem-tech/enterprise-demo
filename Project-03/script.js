$(document).ready(function () {
    const questionElement = document.getElementById('question-container');
    const rankingContainer = document.getElementById('ranking-container');
    const statusContainer = document.getElementById('status-container');
    const answerButtons = Array.from(document.querySelectorAll('#answers .answer'));
    const canvas = document.getElementById('firework-canvas');
    const ctx = canvas.getContext('2d');
    let correctAnswer = 0; // Index of the correct answer
    let hasAnswered = false;
    let points = 0; // Initial points
    let continuity = 1; // Continuity number

    function disableQuestion() {
        answerButtons.forEach(button => button.classList.add('disabled'));
    }

    function checkPlayerStatus() {
        try {
            $.ajax({
                url: 'YOUR_SHAREPOINT_API_ENDPOINT_FOR_PLAYER_STATUS',
                method: 'GET',
                success: function(data) {
                    const player = data; // Adjust based on actual data structure
                    const today = new Date().toISOString().split('T')[0];
                    const lastAnsweredDate = new Date(player.modifiedDate).toISOString().split('T')[0];
                    
                    if (today === lastAnsweredDate) {
                        $(questionElement).remove();
                        getTopPlayers(); // Show ranking 
                        rankingContainer.style.opacity = 1; // Ensure ranking container is fully visible
                        statusContainer.style.opacity = 1; // Ensure status container is fully visible
                        rankingContainer.style.height = "auto"; // Ensure ranking container is fully visible
                    } else {
                        // Fetch and display new question
                        setQuestion();
                    }
                },
                error: function(err) {
                    console.error('Error retrieving player status:', err);
                    // Fallback to simulated data
                    useFallbackData();
                }
            });
        } catch (error) {
            console.error('SharePoint connection failed:', error);
            // Fallback to simulated data
            useFallbackData();
        }
    }

    function useFallbackData() {
        // Simulated data (fallback when SharePoint unavailable)
        const today = new Date().toISOString().split('T')[0];
        const player = { modifiedDate: '2024-07-21' }; // Simulated player data

        if (today === new Date(player.modifiedDate).toISOString().split('T')[0]) {
            $(questionElement).remove();
            getTopPlayers(); // Show ranking if already answered
            rankingContainer.style.opacity = 1; // Ensure ranking container is fully visible
            statusContainer.style.opacity = 1; // Ensure status container is fully visible
            rankingContainer.style.height = "auto"; // Ensure ranking container is fully visible
        } else {
            setQuestion(); // Fetch and display new question
        }
    }

    function setQuestion() {
        try {
            $.ajax({
                url: 'https://your-sharepoint-site/_api/web/lists/getbytitle(\'Questions\')/items', // Fetch all questions
                method: 'GET',
                headers: { 'Accept': 'application/json;odata=verbose' },
                success: function(data) {
                    const questions = data.d.results;
                    const length = questions.length;
                    const randomIndex = Math.floor(Math.random() * length); // Choose a random index
                    const questionItem = questions[randomIndex]; // Get the random question item
      
                    const questionText = questionItem.Title;
                    const answers = [
                        questionItem.Ans1,
                        questionItem.Ans2,
                        questionItem.Ans3,
                        questionItem.Ans4
                    ];
                    const correctAnswer = questionItem.corrAns;
      
                    // Set the question text
                    document.getElementById('question').innerText = questionText;
      
                    // Set the answer buttons without shuffling
                    const answerButtons = Array.from(document.querySelectorAll('#answers .answer'));
                    answerButtons.forEach((button, index) => {
                        button.innerText = answers[index];
                        button.onclick = () => selectAnswer(answers[index] === correctAnswer ? index : -1);
                    });
                },
                error: function(error) {
                    console.error('Error fetching question:', error);
                    // Fallback to default question
                    setFallbackQuestion();
                }
            });
        } catch (error) {
            console.error('SharePoint question fetch failed:', error);
            // Fallback to default question
            setFallbackQuestion();
        }
    }

    function setFallbackQuestion() {
        // Fallback question when SharePoint unavailable
        questionElement.querySelector('p').innerText = 'What is the capital of Saudi Arabia?';
        correctAnswer = 0;
        answerButtons[0].innerText = 'Riyadh';
        answerButtons[1].innerText = 'Jeddah';
        answerButtons[2].innerText = 'Dammam';
        answerButtons[3].innerText = 'Mecca';

        answerButtons.forEach((button, index) => {
            button.onclick = () => selectAnswer(index);
        });
    }

    function showFireworks() {
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let particles = [];
        const numberOfLaunches = 3; // Defined number of launches
        let launchCount = 0;

        function createParticle(x, y, color1, color2) {
            let count = 100;
            while (count--) {
                let color = count % 2 === 0 ? color1 : color2; // Alternate colors
                particles.push({
                    x: x,
                    y: y,
                    size: Math.random() * 2 + 1,
                    speedX: (Math.random() - 0.5) * 10,
                    speedY: (Math.random() - 0.5) * 10,
                    opacity: 1,
                    color: color
                });
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((particle, index) => {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${particle.color}, ${particle.opacity})`;
                ctx.fill();
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                particle.size *= 0.96;
                particle.opacity -= 0.01;
                if (particle.opacity <= 0) {
                    particles.splice(index, 1);
                }
            });
            if (particles.length) {
                requestAnimationFrame(animateParticles);
            } else if (launchCount < numberOfLaunches) {
                setTimeout(() => {
                    launchFireworks();
                }, 400); // Delay between launches
            } else {
                canvas.style.display = 'none';
            }
        }

        function launchFireworks() {
            launchCount++;
            let x = canvas.width / 2;
            let y = canvas.height / 2;
            let color1 = '0, 255, 0'; // Green
            let color2 = '0, 0, 255'; // Blue
            createParticle(x, y, color1, color2);
            animateParticles();
        }

        launchFireworks(); // Start the first launch
    }

    function getTopPlayers() {
        try {
            $.ajax({
                url: 'https://your-sharepoint-site/_api/web/lists/getbytitle(\'TopPlayers\')/items?$orderby=Points desc',
                method: 'GET',
                headers: { 'Accept': 'application/json;odata=verbose' },
                success: function(data) {
                    const players = data.d.results;
                    // Sort players by points in descending order and get the top 3
                    const topPlayers = players.sort((a, b) => b.Points - a.Points).slice(0, 3);
        
                    const list = document.getElementById('top-players');
                    list.innerHTML = '';
        
                    topPlayers.forEach((player, index) => {
                        const li = document.createElement('li');
                        li.className = ['first', 'second', 'third'][index];
                        li.innerText = `${player.Title}: ${player.Points} points`;
                        list.appendChild(li);
                    });
                },
                error: function(error) {
                    console.error('Error fetching top players:', error);
                    // Fallback to static data
                    setFallbackPlayers();
                }
            });
        } catch (error) {
            console.error('SharePoint top players fetch failed:', error);
            // Fallback to static data
            setFallbackPlayers();
        }
    }

    function setFallbackPlayers() {
        // Static data for testing when SharePoint unavailable
        const playerList = document.getElementById('top-players');
        playerList.innerHTML = `
            <li class="first">Ahmed: 150 points</li>
            <li class="second">Fatima: 120 points</li>
            <li class="third">Omar: 100 points</li>
        `;
    }

    function selectAnswer(selectedIndex) {
        if (hasAnswered) return; // Prevent multiple answers

        hasAnswered = true;

        // Mark all buttons as correct or wrong
        answerButtons.forEach((button, index) => {
            button.classList.remove('clicked', 'correct', 'wrong'); // Reset classes
            if (index === selectedIndex) {
                button.classList.add('clicked');
                if (index === correctAnswer) {
                    button.classList.add('correct');
                    updatePlayerPoints(0)
                }
                else {
                    button.classList.add('wrong');
                }
            } else {
                if (index === correctAnswer) {
                    button.classList.add('correct');
                } else {
                    button.classList.add('wrong');
                }
            }
        });

        disableQuestion();
        showFireworks();

        // Initial animation
        questionElement.classList.remove('col-12');
        questionElement.classList.add('col-10');

        // Second animation
        setTimeout(() => {
            questionElement.classList.remove('col-10');
            questionElement.classList.add('col-md-6');
            rankingContainer.classList.remove('col');
            rankingContainer.classList.add('col-md-6');
            rankingContainer.style.opacity = 1; // Ensure ranking container is fully visible
            statusContainer.style.opacity = 1; // Ensure status container is fully visible
        }, 500); // Delay to match initial animation duration
        setTimeout(() => {
            rankingContainer.style.height = "auto"; // Ensure ranking container is fully visible
        }, 2000);
    }

    // Initial check
    checkPlayerStatus();
});

function updatePlayerPoints(playerId) {
    try {
        // Fetch the player's current points and continuity
        $.ajax({
            url: `https://your-sharepoint-site/_api/web/lists/getbytitle('PlayerPoints')/items?$filter=Id eq ${playerId}`,
            method: 'GET',
            headers: { 'Accept': 'application/json;odata=verbose' },
            success: function(data) {
                const player = data.d.results[0];
                if (!player) return; // Exit if no player found
    
                let currentPoints = player.Points || 0;
                let lastAnswerDate = player.LastAnswerDate || '';
                let continuity = player.Continuity || 1;
                let today = new Date().toISOString().slice(0, 10);
    
                if (lastAnswerDate !== today) {
                    // If the player hasn't answered today
                    continuity = 1; // Reset continuity
                    currentPoints += 1; // Add one point
                } else {
                    // If the player has answered today
                    continuity += 1; // Increase continuity
                    currentPoints += continuity; // Add points based on continuity
                }
    
                // Update the player's points and continuity in SharePoint
                $.ajax({
                    url: `https://your-sharepoint-site/_api/web/lists/getbytitle('PlayerPoints')/items(${playerId})`,
                    method: 'MERGE',
                    headers: {
                        'Accept': 'application/json;odata=verbose',
                        'X-HTTP-Method': 'MERGE',
                        'If-Match': player.__metadata.etag,
                        'Content-Type': 'application/json;odata=verbose'
                    },
                    data: JSON.stringify({
                        Points: currentPoints,
                        Continuity: continuity,
                        LastAnswerDate: today
                    }),
                    success: function() {
                        console.log('Player points updated successfully.');
                    },
                    error: function(error) {
                        console.error('Error updating player points:', error);
                    }
                });
            },
            error: function(error) {
                console.error('Error fetching player data:', error);
            }
        });
    } catch (error) {
        console.error('SharePoint player points update failed:', error);
    }
}