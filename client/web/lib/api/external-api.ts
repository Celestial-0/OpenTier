export async function fetchGithubStarsApi(repo: string): Promise<number> {
    const response = await fetch(`https://api.github.com/repos/${repo}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch GitHub stars (${response.status})`);
    }

    const data = await response.json();
    return typeof data?.stargazers_count === 'number' ? data.stargazers_count : 0;
}
