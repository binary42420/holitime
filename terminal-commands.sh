# Install BFG Repo-Cleaner (or download from https://rtyley.github.io/bfg-repo-cleaner/)
# Then run:
bfg --delete-files "*.node" --no-blob-protection

# Or use git filter-repo (more complex but built-in):
git filter-repo --path 'handsonlabor-website/node_modules/' --invert-paths

# Then force push
git push origin --force