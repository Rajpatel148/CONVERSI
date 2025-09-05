import "./Error.css";

const Error = () => {
    return (
        <section className=" error-section">
            <div id="error-text">
                <figure>
                    <img
                        src="https://cdn.dribbble.com/users/722246/screenshots/3066818/404-page.gif"
                        alt="404 page"
                    />
                </figure>
                <div className="text-center">
                    <h1>OOPS !</h1>
                    <p className="p-a">404 – This page failed the ping test</p>
                </div>
            </div>
        </section>
    );
};

export default Error;
