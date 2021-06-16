import { Component } from 'react';

export class ErrorBoundary extends Component {
    constructor () {
        super();

        this.state = {
            error: null,
        };
    }

    componentDidCatch (error) {
        this.setState({ error });
    }

    render () {
        if (this.state.error) {
            const title = this.state.error instanceof Error ? this.state.error.message : this.state.error.toString();
            const body = this.state.error instanceof Error ? encodeURI(this.state.error.stack) : "";

            return (
                <div style={{margin:20}}>
                    <h1 style={{color:"#999"}}>Sorry Population Mesh has crashed</h1>
                    <p style={{color:"#666"}}>This was slightly unexpected. Apologies for that.</p>
                    <p style={{color:"#666"}}>Population Mesh is still a work in progress so may crash occasionally.</p>
                    <p style={{color:"#666"}}>If you feel so inclined you can report this bug at <a href={`https://github.com/IJMacD/population-mesh/issues/new?title=${title}&body=${body}`}>GitHub</a>.</p>
                    <p style={{color:"#666"}}>
                        <ErrorDetails error={this.state.error} />
                    </p>
                </div>
            )
        }

        return this.props.children;
    }
}

function ErrorDetails ({ error }) {
    if (error instanceof Error) {
        return (
            <code style={{whiteSpace:"pre"}}>
                {error.stack || error.message}
            </code>
        )
    }

    return <code>
        {error.toString()}
    </code>;
}