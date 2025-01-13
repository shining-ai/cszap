#include <stdio.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <string.h>
#include <arpa/inet.h>
#include <signal.h>
#include <stdlib.h>
#include <errno.h>
#define BUFFER_SIZE 1024

volatile sig_atomic_t running_client = 1;

void handle_sigint(int sig)
{
    running_client = 0;
}

int main(int argc, char *argv[])
{
    long port;
    int socket_fd;
    struct sockaddr_in6 server_addr;
    struct sigaction sa;
    char buffer[BUFFER_SIZE];
    char *strtol_endptr;

    sigemptyset(&sa.sa_mask);
    sa.sa_handler = handle_sigint;
    sa.sa_flags = 0;

    if (sigaction(SIGINT, &sa, NULL) == -1)
    {
        perror("sigaction");
        return EXIT_FAILURE;
    }

    if (argc < 2)
    {
        printf("Usage: %s <port番号>\n", argv[0]);
        return EXIT_FAILURE;
    }

    errno = 0; // strtolのエラー判定のため初期化
    port = strtol(argv[1], &strtol_endptr, 10);
    if (*strtol_endptr != '\0')
    {
        printf(" Invalid port number. Please enter a numeric value.: %s\n", strtol_endptr);
        return EXIT_FAILURE;
    }
    if (errno != ERANGE && !(0 <= port && port <= 65535))
    {
        printf("Port number must be between 1 and 65535.: %ld\n", port);
        return EXIT_FAILURE;
    }

    // ソケットの作成
    socket_fd = socket(AF_INET6, SOCK_STREAM, 0);
    if (socket_fd < 0)
    {
        perror("Error creating socket");
        return EXIT_FAILURE;
    }

    // アドレス設定
    server_addr.sin6_family = AF_INET6;
    server_addr.sin6_addr = in6addr_any;
    server_addr.sin6_port = htons(port);
    if (inet_pton(AF_INET6, "::1", &server_addr.sin6_addr) <= 0)
    {
        perror("Invalid IP address");
        close(socket_fd);
        return EXIT_FAILURE;
    }

    // サーバに接続
    if (connect(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
    {
        perror("Error connecting to server");
        close(socket_fd);
        return EXIT_FAILURE;
    }
    printf("Connected to server.\n");

    while (running_client)
    {
        // ユーザーからの入力を受け取る
        printf("Enter message: ");
        if (fgets(buffer, BUFFER_SIZE, stdin) == NULL)
        {
            break;
        }

        // サーバにデータを送信
        if (send(socket_fd, buffer, strlen(buffer), 0) < 0)
        {
            perror("Error sending data");
            break;
        }

        // サーバからのレスポンスを受け取る
        int bytes_read = recv(socket_fd, buffer, BUFFER_SIZE, 0);
        if (bytes_read < 0)
        {
            perror("Error receiving data");
            break;
        }
        printf("Received: %s", buffer);
    }

    // ソケットを閉じる
    close(socket_fd);
}
