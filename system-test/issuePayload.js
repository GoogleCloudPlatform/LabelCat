module.exports = {
  body: {
    action: 'opened',
    issue: {
      number: 2,
      title: 'LABELCAT-TEST',
      labels: [
        {
          id: 949737505,
          node_id: 'MDU6TGFiZWw5NDk3Mzc1MDU=',
          url: 'https://api.github.com/repos/Codertocat/Hello-World/labels/bug',
          name: 'bug',
          color: 'd73a4a',
          default: true,
        },
      ],
      state: 'open',
      body: "It looks like you accidently spelled 'commit' with two 't's.",
    },
    repository: {
      name: 'Hello-World',
      owner: {
        login: 'Codertocat',
      },
    },
  },
};
